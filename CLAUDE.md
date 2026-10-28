# CLAUDE.md — glowstocks

Context for future Claude sessions working in this repo.

## What this is

An on-demand, **source-backed** equity-research dashboard for **Indian** listed
companies (NSE/BSE). A GitHub Actions robot researches one company and a Bedrock
Claude model extracts a **citation-backed** report (`data/companies/<TICKER>.json`);
the Next.js dashboard renders it as visual tabs and exports it. Read `README.md`
first for the full loop and setup.

## Architecture (where things live)

```
scripts/                      THE RESEARCH ENGINE (runs in GitHub Actions, never the Worker)
  analyze.ts                  orchestrator: preflight → harvest → facts → sections → sanity → review → write
  lib/
    bedrock.ts                Claude via Bedrock Converse (bearer key); preflight; prompt caching
    json.ts                   completeJSON driver (ajv schema validation + retry)
    harvest.ts                Screener login (playwright-core) + PDF→text (unpdf) + cheerio parse
    firecrawl.ts              cheap /search + run-cached /scrape (cost control)
    facts.ts                  one verified fact sheet injected (cached) into every section
    text.ts                   relevantPages() — pick the pages that matter from a long doc
    sources.ts                SourceCollector — the provenance spine + auto source_id stamping
    sanity.ts                 range/ordering checks (impossible → "Not available")
    review.ts                 deterministic cross-section reconciliation (softening only)
    cache.ts                  read-once cache + incremental (--sections) plan
    sections/*.ts             per-section extractors — 13 of them:
                              snapshot, business, financials, peers, thesis,
                              customers, capacity, growth, concall, mna, estimates, risks, integrity

src/
  lib/types/report.ts         THE v1 DATA CONTRACT (pure types, shared by engine + UI)
  lib/{env,bundledReports,githubReports,format,palette,charts}.ts
  lib/theme.ts                VIVID chrome map — per-tab + per-section accents/icons, KPI
                              accents, logo gradients, timeAgo, coverageAccent (NOT chart data)
  app/page.tsx                SEARCH-FIRST LANDING (route "/") — hero search + previous-runs table
  app/company/[ticker]/page.tsx              the dashboard, behind a View/Back flow
  components/{Landing,CompanyView,ProgressScreen,Header}.tsx   landing · dashboard shell ·
                              client-facing research progress · header (Back + search + export)
  components/{Icon,AccentScope,KpiStrip}.tsx inline-SVG icons · tab-accent context · compact KPI strip
  app/api/report/{run,get,status}/route.ts   dispatch · read-back · poll
  app/api/stock-search/route.ts              server-side company-search proxy (India NSE/BSE)
  lib/export/reportModel.ts                  THE shared "walk the report → emit every
                                             populated field" layer (coverage · provenance ·
                                             units · 3 states). BOTH exports render it.
  lib/export/excelWorkbook.ts                PREMIUM bespoke .xlsx builder (Cover + 8 section
                                             sheets), rendered generically from reportModel
  app/api/export/excel/route.ts              thin route → buildWorkbook()
  components/print/PrintKit.tsx              shared print kit (loader, brand header/footer, auto-print)
  app/onepager/[ticker]/page.tsx             premium one-pager (landscape, real ECharts)
  app/report/[ticker]/print/page.tsx         full multi-page report (print → PDF)
  components/                 Dashboard shell, Header, tabs/*, charts/EChart, WidgetCard, CitedValue…

data/companies/<TICKER>.json  committed reports (durable cache). TCS.json is the sample.
.github/workflows/analyze.yml the robot
```

## Invariants — do not break

- **Secrets:** `CLAUDE_BEDROCK_API_KEY`, `FIRECRAWL_API_KEY`, `SCREENER_*` live
  ONLY in GitHub Actions. The Worker holds ONLY `GITHUB_DISPATCH_TOKEN`. This repo
  is public — never hardcode a secret.
- **Engine isolation:** nothing under `src/app` may import from `scripts/`
  (Playwright/cheerio/unpdf must never enter the Worker bundle). Scripts MAY import
  the pure types from `@/lib/types/report` (types erase at build).
- **Never guess data; three distinct states.** A cited value with
  `available: false`/null → "n/a (not disclosed)"; a section flagged
  inapplicable (`customers.applicable`, `capacity.applicable`, `mna.found`,
  `concall.available`, `estimates.available` = false) → its "Not applicable"
  reason; an absent optional field → "—". Never a guessed 0 or "".
- **Exports are model-driven — never hand-pick fields.** BOTH the full-report
  PDF (`app/report/[ticker]/print`) and the Excel (`lib/export/excelWorkbook.ts`)
  render from `lib/export/reportModel.ts` (`buildReportModel`), which emits EVERY
  populated field, a `Source(s)` cell per multi-value row, and routes every value
  through `format.ts`'s `formatValue`. When you add/extend a section, add it to
  `buildReportModel` only — both exports update together. `npm run check:coverage`
  FAILS if the model drops any populated leaf of the TCS sample; keep it green.
- **Never waste credits.** Keep read-once harvest, run-level Firecrawl cache,
  Bedrock prompt caching, and incremental `--sections` refresh intact.
- **Extraction output ceiling is central + self-healing — don't re-tune it
  per section.** `maxTokens` is a CEILING (billed per token actually generated),
  so a low one silently truncates a data-rich section's JSON mid-stream → invalid
  JSON → the section fails. ONE generous ceiling governs all sections
  (`extractSection` default in `scripts/lib/sections/common.ts`); sections do NOT
  pass their own `maxTokens`. If a response ever still stops on `max_tokens`,
  `completeJSONWith` (`scripts/lib/json.ts`) escalates the budget and retries, so
  the truncation class can't recur. Never reintroduce small per-section ceilings.
- **Charts follow the dataviz skill:** validated palette (`src/lib/palette.ts`),
  ONE axis per chart, **no scatter / bubble / dual-axis**, legend for ≥2 series,
  crosshair tooltips, text in ink tokens. The palette is validated by
  `scripts/validate_palette.js` in the dataviz skill — re-run it if you change hues.
- **UI follows the dashboard-builder skill — kept STRUCTURE, vivid COLOUR.** 3-zone
  shell, 48px header, `WidgetCard` for every widget (no cards-in-cards),
  shimmer/empty/error states. The restrained indigo+grey colour rule is overridden
  per the owner's "super colourful" direction: per-tab + per-section accents/icons
  (`src/lib/theme.ts` + `Icon`), accent card headers, ONE compact `KpiStrip` (not a
  wall of big KPI cards). The widget grid is a responsive FIXED column count
  (`.gs-grid`/`.gs-span-*`) so cards tile the full width — never auto-fill span gaps.
- **Search-first, standalone, and NO backend/vendor names user-facing.** The app
  opens on the landing search screen; the dashboard lives at `/company/[ticker]`
  behind a Back flow. The research-progress screen (`ProgressScreen`) speaks only in
  analyst steps, never tools/vendors/run links. Never surface "GitHub/Actions/
  workflow/dispatch/artifact", "Claude/AI/model", "Firecrawl/Bedrock/Screener" in any
  user-facing text (progress, notices, errors, tooltips, empty states, footer).
  `format.ts`'s `cleanSource` relabels the harvest-vendor name at RENDER only (data,
  citations, deep links and exports unchanged). Errors use plain language.
- **Pin Next to 16.3.x (do NOT bump to 16.4+ yet).** `@opennextjs/cloudflare`
  1.20.9 (the latest) does not handle Next 16.4's new `preview-props.json` server
  manifest: the deployed Worker throws at startup (`Unexpected
  loadManifest(.../preview-props.json)` → Cloudflare **Error 1101** on every
  route). 16.3.8 satisfies the adapter's `>=16.3.8` peer and renders fine. Only
  bump Next once a newer `@opennextjs/cloudflare` adds 16.4 support — and verify
  with `npm run preview` (the local Worker) before trusting a deploy.

## Commands

```bash
npm run dev         # renders the TCS sample with no keys
npm run typecheck   # tsc --noEmit  (run before committing)
npm run build       # OpenNext → Worker bundle (.open-next/) — THE deploy artifact
npm run build:next  # plain Next build (.next/) — fast check, no Worker bundle
npm run build:cf    # alias of `build`
npm run check:coverage   # FAILS if the full-report export drops any populated field
npm run analyze -- <TICKER> ["Name"] [--sections a,b]
```

Deploy note: the Cloudflare build command MUST be `npm run build` (the OpenNext
bundle). `wrangler deploy` delegates to `opennextjs-cloudflare deploy`, which needs
`.open-next/`; a plain `next build` only makes `.next/` and the deploy fails with
"Could not find compiled Open Next config". `build` runs `next build` internally,
so it still type-checks `scripts/**` — keep the engine type-clean. ESLint does not
run during the build (Next 16 removed it); run `npm run lint` separately.

## Extending

- **Add a committed company to the bundle:** drop its JSON in `data/companies/`,
  import it in `src/lib/bundledReports.ts`.
- **Add/modify a section:** edit `src/lib/types/report.ts` (contract + `SECTION_KEYS`) +
  the matching `scripts/lib/sections/<name>.ts` (extractor + JSON schema) + wire it into
  `scripts/analyze.ts` (task, empty factory, coverage, assembly) + render it in a `*Tab.tsx`.
  `refreshPlan` reads `SECTION_KEYS` directly, so adding a key to the contract auto-joins
  the incremental-refresh plan.
- **Tab map (8 tabs):** Snapshot · Business · Customers & Capacity · Financials ·
  Growth & Concall · Peers & Estimates · Thesis & Risks · Sources & Integrity. Composite
  tabs stack section components (e.g. `PeersTab` + `EstimatesSection`).
- **Exports (3):** One-pager (PDF) `/onepager/[ticker]`, Full report (PDF)
  `/report/[ticker]/print`, Full data (Excel) `/api/export/excel` →
  `lib/export/excelWorkbook.ts`. All read the CURRENT loaded report and work on the
  sample with no keys. When you add a section, extend `excelWorkbook.ts` (a sheet or
  block) and the full-report print page; every exported figure keeps its source, and
  "Not available" renders as "n/a"/"Not available", never blank. Print routes render
  real ECharts with `animate={false}`; keep charts single-axis (dataviz).
- **Status matching:** the workflow's `run-name` is `analyze <ticker>`; the status
  route matches on it. Keep them in sync.
