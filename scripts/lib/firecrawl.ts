// Firecrawl web research for what the filings can't answer (peers, estimates,
// news, M&A). COST-CONTROLLED, same shape as cgchecklist/cgchecklist2.0:
//   1) cheap /search (title + snippet + url, ~1 credit, NO scrapeOptions)
//   2) /scrape ONCE per URL per run, memoised — a document surfaced by several
//      queries is billed once, not once per query.
// Best-effort: returns "" / [] on any failure so a run never crashes on it.

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";
const SEARCH_TIMEOUT_MS = 30_000;
const SCRAPE_TIMEOUT_MS = 90_000;
const MAX_HITS = 5;
const PER_HIT_CHARS = 3000;
const MAX_EVIDENCE_CHARS = 14_000;

const apiKey = (): string => process.env.FIRECRAWL_API_KEY?.trim() ?? "";
export const firecrawlConfigured = (): boolean => apiKey().length > 0;

export interface FcHit {
  url: string;
  title?: string;
  description?: string;
  snippet?: string;
}

// Run-level scrape cache: url -> scraped markdown (as a Promise so concurrent
// queries racing on the same URL share one in-flight fetch). Keyed per process =
// exactly one analyze.ts run.
const scrapeCache = new Map<string, Promise<string>>();
/** Every URL scraped this run — folded into the report's persistent sources_seen. */
const scrapedThisRun = new Set<string>();

export function resetFirecrawlCache(): void {
  scrapeCache.clear();
  scrapedThisRun.clear();
}
export function scrapedUrls(): string[] {
  return [...scrapedThisRun];
}

function hitsFrom(data: {
  data?: FcHit[] | { web?: FcHit[]; news?: FcHit[] };
  web?: FcHit[];
}): FcHit[] {
  const d = data.data;
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.web)) return d.web;
  if (Array.isArray(data.web)) return data.web;
  return [];
}

/** Cheap search — top hits (title + snippet + url), NO scraping. */
export async function searchHits(query: string): Promise<FcHit[]> {
  const key = apiKey();
  if (!key) return [];
  try {
    const res = await fetch(`${FIRECRAWL_BASE}/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: MAX_HITS }),
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Parameters<typeof hitsFrom>[0];
    return hitsFrom(data).filter((h) => h.url);
  } catch {
    return [];
  }
}

/** Scrape one URL's page as markdown, memoised for the whole run. "" on failure. */
export async function scrapeUrl(url: string): Promise<string> {
  const cached = scrapeCache.get(url);
  if (cached) return cached;
  const p = (async () => {
    const key = apiKey();
    if (!key) return "";
    try {
      const res = await fetch(`${FIRECRAWL_BASE}/scrape`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["markdown"] }),
        signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
      });
      if (!res.ok) return "";
      const data = (await res.json()) as { data?: { markdown?: string }; markdown?: string };
      const md = (data.data?.markdown ?? data.markdown ?? "").trim();
      if (md) scrapedThisRun.add(url);
      return md;
    } catch {
      return "";
    }
  })();
  scrapeCache.set(url, p);
  return p;
}

export interface Evidence {
  text: string;
  hits: FcHit[];
}

/**
 * Search the web and return an evidence block (title + url + page markdown per
 * hit) PLUS the hits used (so the caller can record them as Sources). Any
 * document shared across queries is scraped only once per run.
 */
export async function webResearch(query: string): Promise<Evidence> {
  const hits = await searchHits(query);
  if (!hits.length) return { text: "", hits: [] };

  const blocks = await Promise.all(
    hits.slice(0, MAX_HITS).map(async (h) => {
      const markdown = await scrapeUrl(h.url);
      const body = (markdown || h.description || h.snippet || "").trim().slice(0, PER_HIT_CHARS);
      return `SOURCE: ${h.title ?? ""} (${h.url})\n${body}`;
    }),
  );
  return { text: blocks.join("\n\n---\n\n").slice(0, MAX_EVIDENCE_CHARS), hits };
}
