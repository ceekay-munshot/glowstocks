# glowstocks

**On-demand, fully-automated, source-backed equity research for Indian listed companies (NSE/BSE).**

An analyst types one company. A GitHub Actions robot researches it — Screener
financials, the annual report, concall transcripts, the investor presentation and
the web — and a language model (Claude via AWS Bedrock) extracts a structured,
**citation-backed** report. The dashboard shows it as a colourful, low-text,
visual report with tabs, and exports a one-pager PDF + a multi-sheet Excel.

Every data point carries its own source, date, locator and link — hover any number
to see where it came from. Nothing is guessed: a figure the sources don't contain
shows **"Not available"**.

> The dashboard renders from a committed **sample** (`data/companies/TCS.json`)
> with **zero keys set** — clone, `npm i`, `npm run dev`, done.

---

## The loop

```
 ┌──────────┐   dispatch    ┌─────────────────────┐   commit+artifact   ┌───────────┐
 │ Dashboard │ ───────────▶ │ GitHub Actions robot │ ─────────────────▶ │  Report   │
 │ (Worker)  │  analyze.yml  │  scripts/analyze.ts  │  data/companies/   │  JSON     │
 │           │ ◀─────────── │  harvest→extract→cite │   <TICKER>.json    │           │
 └──────────┘   read-back    └─────────────────────┘   + artifact        └───────────┘
```

1. **Search** a company (server-side Screener proxy) or type a ticker.
2. **Run** → a Next.js API route dispatches the `analyze.yml` workflow via the
   GitHub API using `GITHUB_DISPATCH_TOKEN`.
3. The Action runs `scripts/analyze.ts <TICKER>`: **harvest → extract (Bedrock) →
   write `data/companies/<TICKER>.json`**, commit it (durable cache) and upload it
   as the `glow-report-<TICKER>` artifact (immediate read-back).
4. The dashboard polls run status, loads the report when ready, and renders the
   tabs. **Re-opening a cached company reads the committed JSON = 0 credits.**
   "Refresh" = an incremental run.

### Security model

| Secret | Lives in | Never in |
| --- | --- | --- |
| `CLAUDE_BEDROCK_API_KEY`, `FIRECRAWL_API_KEY`, `SCREENER_EMAIL/PASSWORD` | **GitHub Actions only** | the Worker, the browser |
| `GITHUB_DISPATCH_TOKEN` | the Cloudflare Worker | the browser |

The Worker only ever holds a GitHub PAT; it cannot see the research keys.

---

## Stack

- **Next.js 16** (App Router) · React 19 · TypeScript · Tailwind v4
- **Charts:** Apache ECharts (`echarts-for-react`) — follows the dataviz skill
  (validated colourblind-safe palette, one axis per chart, crosshair tooltips).
- **Excel:** `exceljs` · **Unzip (read-back):** `fflate`
- **Deploy:** Cloudflare Workers via `@opennextjs/cloudflare` (standard setup).
- **Research engine:** `playwright-core` + `cheerio` + `unpdf` + `tsx` + `ajv`,
  running in GitHub Actions.

---

## Run it

```bash
npm install
npm run dev            # http://localhost:3000 — renders the TCS sample, no keys needed
```

Other scripts:

```bash
npm run build          # Next production build
npm run build:cf       # OpenNext → Cloudflare Worker bundle (.open-next/worker.js)
npm run preview        # build + run the Worker locally (needs .dev.vars)
npm run deploy         # build + deploy to Cloudflare
npm run typecheck      # tsc --noEmit
```

### Run the research engine locally

```bash
export CLAUDE_BEDROCK_API_KEY=...        # Bedrock bearer API key
export CLAUDE_BEDROCK_REGION=us-east-1   # optional (default)
export CLAUDE_BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-5-20250929-v1:0  # optional
export SCREENER_EMAIL=...  SCREENER_PASSWORD=...
export FIRECRAWL_API_KEY=...

npm run analyze -- INFY "Infosys"                 # full run
npm run analyze -- INFY --sections financials     # incremental refresh (only these sections)
# → writes data/companies/INFY.json + report-output/INFY.json
```

---

## Deploy & configure

### 1. GitHub Actions (the research robot)

Repo **Settings → Secrets and variables → Actions**:

- **Secrets:** `CLAUDE_BEDROCK_API_KEY`, `FIRECRAWL_API_KEY`, `SCREENER_EMAIL`, `SCREENER_PASSWORD`
- **Variables (optional, have defaults):** `CLAUDE_BEDROCK_REGION` (`us-east-1`),
  `CLAUDE_BEDROCK_MODEL_ID` (`us.anthropic.claude-sonnet-4-5-20250929-v1:0`)

You can run it by hand: **Actions → analyze → Run workflow → enter a ticker**.

### 2. Cloudflare Worker (the dashboard)

```bash
npx wrangler secret put GITHUB_DISPATCH_TOKEN   # fine-grained PAT: Actions r/w + Contents read
# GITHUB_REPO is set in wrangler.jsonc (default: ceekay-munshot/glowstocks)
npm run deploy
```

For local Worker dev, copy `.dev.vars.example` → `.dev.vars` and fill it in.

Without `GITHUB_DISPATCH_TOKEN` the dashboard still fully renders committed reports
(including the sample); only the live **Run** button is disabled (it says so).

---

## v1 data contract

All schemas live in [`src/lib/types/report.ts`](src/lib/types/report.ts). Every data
point is a `Cited<T>`: `{ value, unit, available, source, date, locator, url }`.

| Section | What it holds |
| --- | --- |
| **snapshot** | business model, stance (BUY/HOLD/SELL), headline KPIs |
| **business** | segment revenue mix + trend, operating geographies (driver/risk) |
| **financials** | latest quarter + latest FY + 5-year history |
| **peers** | peer table (price, mcap, P/E, EV/EBITDA, ROE, ROCE, ROA, 5Y growth, D/E) |
| **thesis** | supports, counters, change-my-mind, bear/base/bull scenarios |
| **sources** | the provenance spine — every `{ id, title, type, date, locator, url }` |

### Never waste credits

- **Read-once harvest** — a document URL in `sources_seen` is never re-downloaded.
- **Run-level Firecrawl cache** — each URL is scraped at most once per run.
- **Bedrock prompt caching** — the shared fact sheet + source menu is cached across
  the per-section calls.
- **Incremental refresh** — `--sections` re-extracts only the sections asked for and
  carries the rest forward from the committed report.

---

## Guardrails

India only · never hardcode secrets (this repo is public) · never guess data
("Not available") · never waste credits · no scatter/bubble/dual-axis charts.

_Not investment advice. The committed sample is illustrative, not live data._
