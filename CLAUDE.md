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
  app/api/report/{run,get,status}/route.ts   dispatch · read-back · poll
  app/api/stock-search/route.ts              server-side Screener search proxy
  app/api/export/excel/route.ts              exceljs workbook
  app/onepager/[ticker]/page.tsx             print one-pager (PDF via browser print)
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
- **Never guess data.** A figure the sources don't contain is
  `{ value: null, available: false }` → rendered "Not available".
- **Never waste credits.** Keep read-once harvest, run-level Firecrawl cache,
  Bedrock prompt caching, and incremental `--sections` refresh intact.
- **Charts follow the dataviz skill:** validated palette (`src/lib/palette.ts`),
  ONE axis per chart, **no scatter / bubble / dual-axis**, legend for ≥2 series,
  crosshair tooltips, text in ink tokens. The palette is validated by
  `scripts/validate_palette.js` in the dataviz skill — re-run it if you change hues.
- **UI follows the dashboard-builder skill:** 3-zone shell, 48px header,
  `WidgetCard` for every widget (no cards-in-cards), shimmer/empty/error states.

## Commands

```bash
npm run dev         # renders the TCS sample with no keys
npm run typecheck   # tsc --noEmit  (run before committing)
npm run build       # Next build
npm run build:cf    # OpenNext → Worker bundle (the deploy target)
npm run analyze -- <TICKER> ["Name"] [--sections a,b]
```

Build note: `next build` type-checks `scripts/**` too, so keep the engine
type-clean. ESLint does not run during `next build` (Next 16 removed it); run
`npm run lint` separately.

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
- **Status matching:** the workflow's `run-name` is `analyze <ticker>`; the status
  route matches on it. Keep them in sync.
