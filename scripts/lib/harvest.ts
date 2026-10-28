// Screener harvest for the glowstocks research engine (runs in GitHub Actions,
// NOT the Worker). Logs into Screener with Playwright, renders the company page,
// extracts financials/ratios/shareholding as text, and downloads the newest
// annual report + last 2 concall transcripts + an investor presentation as
// page-marked text (unpdf). Self-contained: no imports from src/, so it never
// enters the Cloudflare Worker bundle.
//
// Adapted from cgchecklist/scripts/lib/harvest.ts (which was itself leaned from
// cgchecklist2.0/lib/harvest/*). Best-effort and never throws — a failed
// login/page/doc degrades to whatever was obtained, with a note.

import fs from "node:fs";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright-core";
import * as cheerio from "cheerio";
import { extractText, getDocumentProxy } from "unpdf";

const CHROMIUM_PATH =
  process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium";
const SCREENER_BASE = "https://www.screener.in";
const LOGIN_URL = `${SCREENER_BASE}/login/`;
const SEARCH_API = `${SCREENER_BASE}/api/company/search/`;
const MIN_REQUEST_INTERVAL_MS = 1500;
const NAV_TIMEOUT_MS = 45_000;
const MAX_AR_CHARS = 2_500_000;
const MAX_CONCALL_CHARS = 500_000;
const MAX_PRESENTATION_CHARS = 400_000;
const CONCALL_COUNT = 2;
// A ceiling, not a target: the WHOLE Screener page (pros/cons, full multi-year
// P&L / balance-sheet / cash-flow / ratios / quarters / shareholding / growth
// ranges) must fit so the fact sheet, financials and trends never lose rows to
// truncation. Screener scraping is free, so this is generous on purpose.
const MAX_SCREENER_TEXT = 120_000;
// Deep-fetch the top N peers by Screener's (cap-sorted) peer order, and cap each
// peer's extracted ratios text — so 6 peers add ~a few KB, not 6 full pages.
const MAX_PEERS = 6;
const MAX_PEER_RATIOS_CHARS = 2500;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export type DocKind =
  | "annual_report"
  | "concall"
  | "presentation"
  | "exchange_filing";

export interface HarvestedDoc {
  name: string;
  kind: DocKind;
  url?: string;
  /** ISO-ish period/label if we can parse one ("FY24", "Aug 2025"). */
  date?: string | null;
  /** Page-marked text ("===== PAGE n ====="). */
  text: string;
  pages?: number;
}

export interface HarvestResult {
  ticker: string;
  name?: string;
  url: string;
  loggedIn: boolean;
  note?: string;
  /** Financials, ratios and shareholding rendered as readable text. */
  screenerText: string;
  /** Peer table rendered as text (Screener's own peer comparison), if present. */
  peersText: string;
  /** Per-peer full ratios, each peer's OWN Screener page rendered to text. The
   *  Screener peer table only carries ~4 columns; the full ratios (P/E, ROE,
   *  ROCE, 5-yr growth, …) live on each peer's page, so we deep-fetch the top ones. */
  peerRatiosText: string;
  annualReportText: string;
  annualReportName?: string;
  annualReportUrl?: string;
  /** All harvested docs (AR + concalls + presentation). */
  documents: HarvestedDoc[];
  /** Recent events/news text (filled by the orchestrator via Firecrawl). */
  recentEvents?: string;
}

interface CompanySearchResult {
  id: number;
  name: string;
  url: string;
}

interface Session {
  loggedIn: boolean;
  note?: string;
  fetchHtml(url: string): Promise<{ ok: boolean; status: number; finalUrl: string; html: string }>;
  download(url: string): Promise<{ ok: boolean; status: number; buffer?: Buffer; contentType?: string }>;
  search(query: string): Promise<CompanySearchResult[]>;
  close(): Promise<void>;
}

async function openSession(): Promise<Session> {
  const proxyServer = process.env.HTTPS_PROXY || process.env.https_proxy || undefined;
  const browser: Browser = await chromium.launch({
    executablePath: fs.existsSync(CHROMIUM_PATH) ? CHROMIUM_PATH : undefined,
    headless: true,
    proxy: proxyServer ? { server: proxyServer } : undefined,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  const context: BrowserContext = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    ignoreHTTPSErrors: process.env.HARVEST_INSECURE_TLS === "1",
  });
  context.setDefaultTimeout(NAV_TIMEOUT_MS);
  const page: Page = await context.newPage();

  let lastRequestAt = 0;
  const polite = async () => {
    const wait = MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt);
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
  };

  let loggedIn = false;
  let note: string | undefined;
  const email = process.env.SCREENER_EMAIL?.trim();
  const password = process.env.SCREENER_PASSWORD?.trim();

  if (email && password) {
    try {
      await polite();
      await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded" });
      await page.fill("#id_username, input[name=username]", email);
      await page.fill("#id_password, input[name=password]", password);
      await page.click("button[type=submit], button:has-text('Login')");
      await page.waitForLoadState("networkidle").catch(() => {});
      loggedIn = !/\/login\/?$/.test(page.url());
      if (!loggedIn) note = "login submitted but still on /login (check SCREENER_* creds)";
    } catch (e) {
      note = `login failed: ${(e as Error).message}`;
    }
  } else {
    note = "SCREENER_EMAIL/PASSWORD not set — proceeding logged-out";
  }

  return {
    loggedIn,
    note,
    async fetchHtml(url) {
      await polite();
      const resp = await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});
      return {
        ok: resp?.ok() ?? false,
        status: resp?.status() ?? 0,
        finalUrl: page.url(),
        html: await page.content(),
      };
    },
    async download(url) {
      await polite();
      // Browser-like headers: external hosts (notably BSE's AnnPdfOpen, which serves
      // most concall transcripts) reject bare requests but return the PDF with a
      // referer + pdf Accept. Harmless for Screener's own downloads.
      const resp = await context.request.get(url, {
        timeout: NAV_TIMEOUT_MS,
        headers: {
          accept: "application/pdf,application/octet-stream,*/*",
          referer: `${SCREENER_BASE}/`,
        },
      });
      if (!resp.ok()) return { ok: false, status: resp.status() };
      return {
        ok: true,
        status: resp.status(),
        buffer: await resp.body(),
        contentType: resp.headers()["content-type"],
      };
    },
    async search(query) {
      const q = query.trim();
      if (!q) return [];
      await polite();
      try {
        const resp = await context.request.get(`${SEARCH_API}?q=${encodeURIComponent(q)}`, {
          timeout: NAV_TIMEOUT_MS,
          headers: { accept: "application/json" },
        });
        if (!resp.ok()) return [];
        const data = (await resp.json()) as unknown;
        return Array.isArray(data)
          ? (data.filter((r) => !!r && typeof (r as CompanySearchResult).url === "string") as CompanySearchResult[])
          : [];
      } catch {
        return [];
      }
    },
    async close() {
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
    },
  };
}

const clean = (t: string) => t.replace(/ /g, " ").replace(/\s+/g, " ").trim();
const absolutize = (href: string) => {
  try {
    return new URL(href, SCREENER_BASE).toString();
  } catch {
    return href;
  }
};

function looksLikeCompanyPage(html: string): boolean {
  return html.includes("top-ratios") || html.includes("profit-loss");
}

function tableToText($: cheerio.CheerioAPI, sectionId: string, heading: string): string {
  const root = $(`#${sectionId}`);
  const table = root.find("table.data-table").first();
  if (!table.length) return "";
  const periods = table.find("thead th").toArray().slice(1).map((th) => clean($(th).text()));
  const lines = table
    .find("tbody tr")
    .toArray()
    .map((tr) => {
      const cells = $(tr).find("td").toArray();
      if (cells.length < 2) return "";
      const label = clean($(cells[0]).text()).replace(/\s*\+\s*$/, "");
      const values = cells.slice(1).map((td) => clean($(td).text()));
      return label ? `${label}: ${values.join(" | ")}` : "";
    })
    .filter(Boolean);
  if (!lines.length) return "";
  return `## ${heading}\nPeriods: ${periods.join(" | ")}\n${lines.join("\n")}`;
}

/** Screener's machine-generated Pros & Cons (#analysis) — a high-signal summary
 *  (debt-free / net-cash, ROE track record, dividend, red flags). */
function analysisToText($: cheerio.CheerioAPI): string {
  const grab = (sel: string, label: string): string => {
    const items = $(`#analysis ${sel} li`)
      .toArray()
      .map((li) => clean($(li).text()))
      .filter(Boolean);
    return items.length ? `${label}:\n- ${items.join("\n- ")}` : "";
  };
  const blocks = [grab(".pros", "Pros"), grab(".cons", "Cons")].filter(Boolean);
  return blocks.length ? `## Pros & Cons (Screener analysis)\n${blocks.join("\n")}` : "";
}

function screenerToText($: cheerio.CheerioAPI): string {
  const parts: string[] = [];
  const ratios: string[] = [];
  $("#top-ratios li").each((_, li) => {
    const name = clean($(li).find(".name").text());
    const value = clean($(li).find(".value").text()) || clean($(li).find(".number").text());
    if (name) ratios.push(`${name}: ${value}`);
  });
  if (ratios.length) parts.push(`## Key ratios\n${ratios.join("\n")}`);

  const analysis = analysisToText($);
  if (analysis) parts.push(analysis);

  for (const [id, h] of [
    ["profit-loss", "Profit & Loss"],
    ["balance-sheet", "Balance Sheet"],
    ["cash-flow", "Cash Flow"],
    ["ratios", "Ratios"],
    ["quarters", "Quarterly Results"],
  ] as const) {
    const t = tableToText($, id, h);
    if (t) parts.push(t);
  }

  const shp = $("#shareholding");
  if (shp.length) {
    const rows = shp
      .find("table.data-table tbody tr")
      .toArray()
      .map((tr) => {
        const cells = $(tr).find("td").toArray();
        if (cells.length < 2) return "";
        const label = clean($(cells[0]).text());
        if (!/promoter|pledge|fii|dii|public/i.test(label)) return "";
        return `${label}: ${cells.slice(1).map((td) => clean($(td).text())).join(" | ")}`;
      })
      .filter(Boolean);
    if (rows.length) parts.push(`## Shareholding\n${rows.join("\n")}`);
  }

  const ranges = rangesToText($);
  if (ranges) parts.push(ranges);

  return parts.join("\n\n").slice(0, MAX_SCREENER_TEXT);
}

/** Screener's compounded-growth range tables (sales/profit growth, ROE) — the
 *  only place the 5-yr sales & profit growth figures are rendered. */
function rangesToText($: cheerio.CheerioAPI): string {
  const blocks = $(".ranges-table")
    .toArray()
    .map((t) => {
      const title = clean($(t).find("th").first().text());
      const rows = $(t)
        .find("tr")
        .toArray()
        .map((tr) => {
          const tds = $(tr).find("td").toArray().map((td) => clean($(td).text()));
          return tds.length >= 2 ? `${tds[0]} ${tds[1]}` : "";
        })
        .filter(Boolean);
      return title && rows.length ? `${title}: ${rows.join(", ")}` : "";
    })
    .filter(Boolean);
  return blocks.length ? `## Growth ranges\n${blocks.join("\n")}` : "";
}

/** Compact ratios block for ONE peer's own Screener page: the top-ratios (P/E,
 *  ROCE, ROE, …), the compounded-growth ranges (5-yr sales/profit growth) and the
 *  multi-year ratios table. Capped so six peers stay a few KB, not six full pages. */
function screenerRatiosToText($: cheerio.CheerioAPI, label: string): string {
  const parts: string[] = [`### ${label}`];
  const ratios: string[] = [];
  $("#top-ratios li").each((_, li) => {
    const name = clean($(li).find(".name").text());
    const value = clean($(li).find(".value").text()) || clean($(li).find(".number").text());
    if (name) ratios.push(`${name}: ${value}`);
  });
  if (ratios.length) parts.push(ratios.join(" | "));
  const ranges = rangesToText($);
  if (ranges) parts.push(ranges);
  const rt = tableToText($, "ratios", "Ratios");
  if (rt) parts.push(rt);
  return parts.join("\n").slice(0, MAX_PEER_RATIOS_CHARS);
}

// Index / benchmark pseudo-companies Screener lists under "Part of" (#benchmarks),
// never real peers — excluded defensively in case one appears in the table.
const INDEX_SYMBOL_RE = /^(NIFTY|SENSEX|BANKNIFTY|CNX|NV\d|NI\d|LIX|NFT|NFTY|NY\d|NQ|LMIDCAP|ENHANCE|NITOP|NTY)/i;

/** Peer company page URLs from the (JS-rendered) peer COMPARISON TABLE — each peer
 *  name cell links to /company/<X>/. ONLY the table: the #benchmarks block above it
 *  is a long list of index links (NIFTY/SENSEX/…) that must not be mistaken for
 *  peers. Deduped, subject excluded, in the table's (market-cap-sorted) order. */
function peerLinks($: cheerio.CheerioAPI, selfUrl: string, limit: number): string[] {
  const self = selfUrl.replace(/\/consolidated\/?$/, "/").replace(/\/+$/, "/");
  const seen = new Set<string>();
  const out: string[] = [];
  $("#peers")
    .find("table")
    .first()
    .find("a[href^='/company/']")
    .each((_, a) => {
      const href = $(a).attr("href") || "";
      // Keep only a bare company URL (/company/XXX/ or /company/XXX/consolidated/).
      const m = href.match(/^\/company\/([^/]+)\/(consolidated\/)?$/);
      if (!m || INDEX_SYMBOL_RE.test(m[1])) return;
      const url = absolutize(`/company/${m[1]}/`);
      if (url === self || seen.has(url)) return;
      seen.add(url);
      out.push(url);
    });
  return out.slice(0, limit);
}

/** Screener's own peer-comparison table, rendered to text (if present). */
function peersToText($: cheerio.CheerioAPI): string {
  const peers = $("#peers");
  if (!peers.length) return "";
  const table = peers.find("table").first();
  if (!table.length) return "";
  const headers = table.find("thead th").toArray().map((th) => clean($(th).text()));
  const rows = table
    .find("tbody tr")
    .toArray()
    .map((tr) => {
      const cells = $(tr).find("td").toArray().map((td) => clean($(td).text()));
      return cells.filter(Boolean).length >= 2 ? cells.join(" | ") : "";
    })
    .filter(Boolean)
    .slice(0, 14);
  if (!rows.length) return "";
  return `## Peer comparison (Screener)\nColumns: ${headers.join(" | ")}\n${rows.join("\n")}`;
}

function annualReportLink($: cheerio.CheerioAPI): { name: string; url: string } | undefined {
  const container = $(".documents.annual-reports, .annual-reports").first();
  const links = (container.length ? container : $("body"))
    .find("a[href]")
    .toArray()
    .map((a) => ({ name: clean($(a).text()), href: $(a).attr("href") || "" }))
    .filter((l) => l.href && /annual|financial-year|\bFY\b|\.pdf/i.test(`${l.name} ${l.href}`))
    .filter((l) => !/^all$|^view all/i.test(l.name.trim()));
  const first = links[0];
  return first ? { name: first.name || "Annual report", url: absolutize(first.href) } : undefined;
}

function concallTranscriptLinks($: cheerio.CheerioAPI, limit: number): { name: string; url: string; date: string | null }[] {
  // Screener renders each concall row as <li> with a period <div> and chips:
  // <a class="button-chip" title="Raw Transcript">Transcript</a> (+ AI Summary / PPT / REC).
  const container = $(".documents.concalls, .concalls").first();
  const scope = container.length ? container : $("#documents");
  if (!scope.length) return [];
  const out: { name: string; url: string; date: string | null }[] = [];
  scope
    .find("li")
    .toArray()
    .forEach((li) => {
      const $li = $(li);
      const period =
        clean($li.find(".ink-600, .font-weight-500, .nowrap, .concall-title").first().text()) ||
        clean($li.contents().first().text());
      const anchors = $li.find("a[href]").toArray();
      const isT = (a: (typeof anchors)[number]) =>
        /transcript/i.test(clean($(a).text())) || /transcript/i.test($(a).attr("title") || "");
      // Prefer a Screener-hosted transcript (most reliably downloadable); else any
      // transcript anchor (usually a BSE/NSE-hosted PDF).
      const transcript =
        anchors.find((a) => isT(a) && /screener\.in/i.test($(a).attr("href") || "")) ||
        anchors.find(isT);
      const href = transcript ? $(transcript).attr("href") : undefined;
      if (href) out.push({ name: `Concall ${period}`.trim(), url: absolutize(href), date: period || null });
    });
  return out.slice(0, limit);
}

/** Newest investor-presentation / fact-sheet (PPT) link from the Documents /
 *  Concalls section, if any — the segment & geography mix usually lives here. */
function presentationLink($: cheerio.CheerioAPI): { name: string; url: string } | undefined {
  const link = $(".documents a[href], .concalls a[href]")
    .toArray()
    .map((a) => ({ name: clean($(a).text()), href: $(a).attr("href") || "" }))
    .find((l) => l.href && /ppt|presentation|fact\s*sheet|factsheet/i.test(`${l.name} ${l.href}`));
  return link ? { name: link.name || "Investor presentation", url: absolutize(link.href) } : undefined;
}

async function pdfToText(buffer: Buffer, maxChars: number): Promise<{ text: string; pages: number }> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const result = await extractText(pdf, { mergePages: false });
  const perPage: string[] = ([] as string[]).concat(result.text as string | string[]);
  const text = perPage
    .map((t, i) => `===== PAGE ${i + 1} =====\n${(t ?? "").trim()}`)
    .join("\n\n")
    .trim()
    .slice(0, maxChars);
  return { text, pages: perPage.length };
}

function isPdf(buffer: Buffer, contentType?: string): boolean {
  if (contentType?.toLowerCase().includes("pdf")) return true;
  return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
}

/**
 * Harvest one company: resolve its Screener page (consolidated → standalone →
 * search), render financials/peers to text, and fetch the newest annual report,
 * the last 2 concall transcripts, and an investor presentation as page-marked
 * text. `skipUrls` is the persistent cost cache — any URL already in it is NOT
 * re-downloaded (read-once).
 */
export async function harvestCompany(
  ticker: string,
  opts: { skipUrls?: Set<string>; fetchPeers?: boolean } = {},
): Promise<HarvestResult> {
  const skip = opts.skipUrls ?? new Set<string>();
  const fetchPeers = opts.fetchPeers ?? true;
  const session = await openSession();
  const notes: string[] = [];
  if (session.note) notes.push(session.note);
  const result: HarvestResult = {
    ticker,
    url: `${SCREENER_BASE}/company/${ticker}/`,
    loggedIn: session.loggedIn,
    screenerText: "",
    peersText: "",
    peerRatiosText: "",
    annualReportText: "",
    documents: [],
  };

  try {
    let page = await session.fetchHtml(`${SCREENER_BASE}/company/${ticker}/consolidated/`);
    if (!page.ok || !looksLikeCompanyPage(page.html)) {
      page = await session.fetchHtml(`${SCREENER_BASE}/company/${ticker}/`);
    }
    if (!looksLikeCompanyPage(page.html)) {
      const hits = (await session.search(ticker)).concat(await session.search(ticker.replace(/\W+/g, " ")));
      if (hits[0]?.url) {
        page = await session.fetchHtml(absolutize(hits[0].url) + "consolidated/");
        if (!looksLikeCompanyPage(page.html)) page = await session.fetchHtml(absolutize(hits[0].url));
      }
    }

    if (!looksLikeCompanyPage(page.html)) {
      notes.push(`could not resolve a Screener company page for ${ticker} (HTTP ${page.status})`);
      result.note = notes.join("; ");
      return result;
    }

    result.url = page.finalUrl;
    const $ = cheerio.load(page.html);
    result.name = clean($("h1").first().text()) || undefined;
    result.screenerText = screenerToText($);
    result.peersText = peersToText($);

    // Peer deep-fetch: the Screener peer table carries only ~4 columns, so fetch
    // each of the top peers' OWN page for full ratios. These are cheap HTML page
    // loads via the same session (rate-limited + capped + deduped), exactly like
    // the subject page — so peer ratios stay fresh and never bloat the cache.
    if (fetchPeers) {
      const peerBlocks: string[] = [];
      for (const purl of peerLinks($, result.url, MAX_PEERS)) {
        if (skip.has(purl)) continue;
        try {
          let pp = await session.fetchHtml(`${purl}consolidated/`);
          if (!looksLikeCompanyPage(pp.html)) pp = await session.fetchHtml(purl);
          if (!looksLikeCompanyPage(pp.html)) continue;
          const $p = cheerio.load(pp.html);
          const peerName = clean($p("h1").first().text()) || purl;
          // The URL is embedded in the label so the extractor can cite each peer
          // datum to that peer's own Screener page.
          const block = screenerRatiosToText($p, `Screener — ${peerName} <${pp.finalUrl}>`);
          if (block) peerBlocks.push(block);
        } catch (e) {
          notes.push(`peer fetch error (${purl}): ${(e as Error).message}`);
        }
      }
      if (peerBlocks.length) {
        result.peerRatiosText = `## Peer ratios — each peer's own Screener page\n\n${peerBlocks.join("\n\n")}`;
      }
    }

    // Annual report (newest).
    const ar = annualReportLink($);
    if (ar && !skip.has(ar.url)) {
      result.annualReportName = ar.name;
      result.annualReportUrl = ar.url;
      try {
        const dl = await session.download(ar.url);
        if (dl.ok && dl.buffer && dl.buffer.length > 0) {
          if (isPdf(dl.buffer, dl.contentType)) {
            const { text, pages } = await pdfToText(dl.buffer, MAX_AR_CHARS);
            result.annualReportText = text;
            if (text) {
              result.documents.push({ name: ar.name, kind: "annual_report", url: ar.url, text, pages });
            } else {
              notes.push("annual report had no extractable text (likely scanned)");
            }
          } else {
            result.annualReportText = dl.buffer.toString("utf8").slice(0, MAX_AR_CHARS);
          }
        } else {
          notes.push(`annual report download HTTP ${dl.status}`);
        }
      } catch (e) {
        notes.push(`annual report fetch error: ${(e as Error).message}`);
      }
    } else if (!ar) {
      notes.push("no annual-report link found on the Screener page");
    }

    // Concall transcripts (newest N).
    for (const c of concallTranscriptLinks($, CONCALL_COUNT)) {
      if (skip.has(c.url)) continue;
      try {
        const dl = await session.download(c.url);
        if (dl.ok && dl.buffer && dl.buffer.length > 0 && isPdf(dl.buffer, dl.contentType)) {
          const { text, pages } = await pdfToText(dl.buffer, MAX_CONCALL_CHARS);
          if (text) result.documents.push({ name: c.name, kind: "concall", url: c.url, date: c.date, text, pages });
        }
      } catch (e) {
        notes.push(`concall fetch error (${c.name}): ${(e as Error).message}`);
      }
    }

    // Investor presentation (best-effort).
    const ppt = presentationLink($);
    if (ppt && !skip.has(ppt.url)) {
      try {
        const dl = await session.download(ppt.url);
        if (dl.ok && dl.buffer && dl.buffer.length > 0 && isPdf(dl.buffer, dl.contentType)) {
          const { text, pages } = await pdfToText(dl.buffer, MAX_PRESENTATION_CHARS);
          if (text) result.documents.push({ name: ppt.name, kind: "presentation", url: ppt.url, text, pages });
        }
      } catch (e) {
        notes.push(`presentation fetch error: ${(e as Error).message}`);
      }
    }
  } catch (e) {
    notes.push(`harvest error: ${(e as Error).message}`);
  } finally {
    await session.close();
  }

  result.note = notes.length ? notes.join("; ") : undefined;
  return result;
}
