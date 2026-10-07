import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Typeahead company search for INDIAN listed companies, proxied through the
 * server so the browser never calls Screener directly. Uses Screener's PUBLIC
 * company-search API (no key needed), which is India-only by nature.
 *
 *   GET /api/stock-search?q=<text>
 *   → { results: [{ ticker, name, url }] }
 *
 * `ticker` is Screener's symbol/code (what analyze.ts expects): an NSE symbol
 * like TCS, or a numeric BSE code for BSE-only names.
 */
interface ScreenerHit {
  id?: number;
  name?: string;
  url?: string; // "/company/TCS/" or "/company/544224/"
}

function tickerFromUrl(url: string): string | null {
  const m = url.match(/\/company\/([^/]+)\/?/);
  return m ? decodeURIComponent(m[1]) : null;
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  try {
    const res = await fetch(
      `https://www.screener.in/api/company/search/?q=${encodeURIComponent(q)}`,
      {
        headers: {
          accept: "application/json",
          "user-agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!res.ok) return NextResponse.json({ results: [], error: `search ${res.status}` });

    const data = (await res.json()) as ScreenerHit[];
    const results = (Array.isArray(data) ? data : [])
      .map((h) => {
        const ticker = h.url ? tickerFromUrl(h.url) : null;
        return ticker && h.name ? { ticker, name: h.name, url: h.url ?? null } : null;
      })
      .filter((r): r is { ticker: string; name: string; url: string | null } => !!r)
      .slice(0, 10);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
