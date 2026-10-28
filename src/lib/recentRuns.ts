// Client-side memory of companies this browser has actually opened/researched.
// The landing "Previous runs" table is seeded server-side from the bundled
// (offline) reports; live-researched tickers aren't bundled, so without this they
// would never appear there. We persist a compact row per viewed company in
// localStorage and merge it into the landing list on mount. This is a per-viewer
// convenience only — never a source of truth — so every access is guarded.

import type { CompanyReport } from "@/lib/types/report";
import { reportToRow, type CompanyRow } from "@/lib/bundledReports";

const KEY = "gs:recentRuns";
const MAX = 12;

/** Read the stored rows, newest-first. Returns [] if storage is empty/blocked. */
export function getRecentRuns(): CompanyRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Keep only well-formed rows (storage can be stale across contract changes).
    return parsed.filter((r): r is CompanyRow => !!r && typeof r.ticker === "string" && typeof r.company === "string");
  } catch {
    return [];
  }
}

/** Record a viewed/researched report as the newest recent run (deduped by ticker). */
export function recordRun(report: CompanyReport): void {
  if (typeof window === "undefined" || !report?.ticker) return;
  try {
    const row = reportToRow(report);
    const rest = getRecentRuns().filter((r) => r.ticker !== row.ticker);
    const next = [row, ...rest].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked (private mode, quota) — the table just won't remember */
  }
}
