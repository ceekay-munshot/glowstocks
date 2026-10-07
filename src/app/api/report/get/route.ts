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
 * Return a company's report, newest-first across three sources:
 *   1) BUNDLED (committed at build time, incl. the sample) — instant, 0 keys.
 *   2) the latest `glow-report-<TICKER>` Actions ARTIFACT — fresh after a run.
 *   3) the committed data/companies/<TICKER>.json via the Contents API — durable.
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

  // 1) Bundled (sample + anything committed at deploy).
  const bundled = getBundledReport(ticker);
  if (bundled) {
    return NextResponse.json({ ok: true, found: true, source: "bundled", report: bundled });
  }

  // 2) Freshest Actions artifact.
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

  return NextResponse.json({ ok: true, found: false });
}
