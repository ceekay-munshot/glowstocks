import { NextResponse } from "next/server";
import { readEnv, repoSlug } from "@/lib/env";

export const dynamic = "force-dynamic";

interface WorkflowRun {
  id: number;
  status: string | null; // queued | in_progress | completed
  conclusion: string | null; // success | failure | cancelled | ...
  display_title?: string;
  name?: string;
  created_at: string;
  html_url: string;
}

/**
 * Poll the status of the most recent analyze.yml run for a ticker, so the UI can
 * show live progress after a Run. The workflow's run-name embeds the ticker
 * ("analyze <TICKER>"), which we match on. Needs GITHUB_DISPATCH_TOKEN (Actions: read).
 */
export async function GET(request: Request) {
  const ticker = new URL(request.url).searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) {
    return NextResponse.json({ ok: false, error: "ticker is required." }, { status: 400 });
  }

  const token = readEnv("GITHUB_DISPATCH_TOKEN");
  const repo = repoSlug();
  if (!token) {
    return NextResponse.json({ ok: true, phase: "unknown", ready: false, done: false });
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/analyze.yml/runs?per_page=20`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "glowstocks-dashboard",
        },
      },
    );
    if (!res.ok) {
      return NextResponse.json({ ok: true, phase: "unknown", ready: false, done: false });
    }
    const data = (await res.json()) as { workflow_runs?: WorkflowRun[] };
    const runs = data.workflow_runs ?? [];
    const re = new RegExp(`\\b${ticker}\\b`, "i");
    const run =
      runs.find((r) => re.test(`${r.display_title ?? ""} ${r.name ?? ""}`)) ?? runs[0] ?? null;

    if (!run) {
      return NextResponse.json({ ok: true, phase: "none", ready: false, done: false });
    }

    const done = run.status === "completed";
    const success = done && run.conclusion === "success";
    const phase = !done ? (run.status ?? "in_progress") : run.conclusion ?? "completed";
    return NextResponse.json({
      ok: true,
      phase, // queued | in_progress | success | failure | ...
      ready: success,
      done,
      conclusion: run.conclusion,
      runUrl: run.html_url,
      startedAt: run.created_at,
    });
  } catch {
    return NextResponse.json({ ok: true, phase: "unknown", ready: false, done: false });
  }
}
