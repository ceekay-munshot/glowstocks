import { NextResponse } from "next/server";
import { readEnv, repoSlug, reportsRef } from "@/lib/env";

// Dispatches an external workflow; never statically optimize.
export const dynamic = "force-dynamic";

interface RunRequest {
  ticker?: string;
  company?: string;
  /** Optional incremental refresh: comma list of sections to re-extract. */
  sections?: string;
  /** Git ref the workflow runs against (defaults to the reports ref). */
  ref?: string;
}

/**
 * Trigger the research engine for a company by dispatching the analyze.yml
 * GitHub Actions workflow. The engine harvests Screener + filings, extracts the
 * cited report, commits data/companies/<TICKER>.json, and uploads it as an
 * artifact — which the dashboard reads back via /api/report/get.
 *
 * Worker config: GITHUB_DISPATCH_TOKEN (secret, Actions: write) + GITHUB_REPO (var).
 */
export async function POST(request: Request) {
  let body: RunRequest;
  try {
    body = (await request.json()) as RunRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const ticker = body.ticker?.trim().toUpperCase();
  const company = body.company?.trim() ?? "";
  const sections = body.sections?.trim() ?? "";
  if (!ticker) {
    return NextResponse.json({ ok: false, error: "ticker is required." }, { status: 400 });
  }

  const token = readEnv("GITHUB_DISPATCH_TOKEN");
  const repo = repoSlug();
  const ref = body.ref?.trim() || reportsRef();

  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Dashboard-triggered runs aren't configured yet. Set the GITHUB_DISPATCH_TOKEN worker secret (a fine-grained PAT with Actions: read & write) to enable them.",
      },
      { status: 501 },
    );
  }

  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/analyze.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "glowstocks-dashboard",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref, inputs: { ticker, company, sections } }),
    },
  );

  if (res.status === 204) {
    return NextResponse.json({ ok: true, status: "dispatched", ticker, repo, ref });
  }

  const detail = await res.text().catch(() => "");
  return NextResponse.json(
    {
      ok: false,
      error: `GitHub workflow dispatch failed (HTTP ${res.status}).`,
      detail: detail.slice(0, 300),
    },
    { status: 502 },
  );
}
