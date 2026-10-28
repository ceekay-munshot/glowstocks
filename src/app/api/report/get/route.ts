import { NextResponse } from "next/server";
import { readEnv, repoSlug, reportsRef } from "@/lib/env";
import { getBundledReport } from "@/lib/bundledReports";
import {
  downloadArtifactReport,
  fetchCommittedReport,
  listLatestArtifact,
} from "@/lib/githubReports";

export const dynamic = "force-dynamic";

/**
 * Return a company's report, FRESHEST-first:
 *   1) The bundled SAMPLE always serves from the build (instant, 0 keys, the
 *      zero-secret demo) — a re-run never shadows the canonical sample.
 *   2) The latest `glow-report-<TICKER>` Actions ARTIFACT — fresh after a run,
 *      so an "Update" wins over any older committed/bundled copy.
 *   3) The committed data/companies/<TICKER>.json via the Contents API — durable.
 *   4) A non-sample BUNDLED report (e.g. INFY) as the OFFLINE fallback — it keeps
 *      a committed company rendering with no keys, but never masks a fresher run.
 * Reopening a cached company therefore costs ZERO research credits.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ticker = url.searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) {
    return NextResponse.json({ ok: false, error: "ticker is required." }, { status: 400 });
  }

  const token = readEnv("GITHUB_DISPATCH_TOKEN");
  const repo = repoSlug();
  const ref = reportsRef();

  // ?debug=1 — confirm token/repo reachability without leaking the secret.
  if (url.searchParams.get("debug") === "1") {
    let apiStatus: number | null = null;
    if (token) {
      try {
        const probe = await fetch(`https://api.github.com/repos/${repo}/actions/artifacts?per_page=1`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "glowstocks-dashboard",
          },
        });
        apiStatus = probe.status;
      } catch {
        apiStatus = -1;
      }
    }
    return NextResponse.json({
      ok: true,
      debug: true,
      ticker,
      repo,
      ref,
      tokenConfigured: !!token,
      githubApiStatus: apiStatus,
      bundled: !!getBundledReport(ticker),
    });
  }

  const bundled = getBundledReport(ticker);

  // 1) The SAMPLE always serves instantly from the bundle (the zero-key demo).
  if (bundled?.is_sample) {
    return NextResponse.json({ ok: true, found: true, source: "bundled", report: bundled });
  }

  // 2) Freshest Actions artifact — a re-run / Update wins over any cached copy.
  if (token) {
    const latest = await listLatestArtifact(ticker, token, repo);
    if (latest) {
      const report = await downloadArtifactReport(latest.id, token, repo);
      if (report) {
        return NextResponse.json({ ok: true, found: true, source: "artifact", report });
      }
    }
    // 3) Durable committed cache.
    const committed = await fetchCommittedReport(ticker, token, repo, ref);
    if (committed) {
      return NextResponse.json({ ok: true, found: true, source: "committed", report: committed });
    }
  }

  // 4) Offline fallback: a non-sample committed company (e.g. INFY) still renders
  //    with no keys, and when nothing fresher could be fetched above.
  if (bundled) {
    return NextResponse.json({ ok: true, found: true, source: "bundled", report: bundled });
  }

  return NextResponse.json({ ok: true, found: false });
}
