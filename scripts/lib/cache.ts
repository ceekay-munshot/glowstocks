// Read-once cache + incremental-refresh helpers. The committed
// data/companies/<TICKER>.json IS the durable cache: reopening a cached company
// reads it (0 credits). A refresh re-extracts only the sections asked for and
// carries the rest forward from the existing report, and the harvest skips any
// document URL already in sources_seen (never re-downloads a 300-page PDF).

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { SECTION_KEYS, type CompanyReport, type SectionKey } from "@/lib/types/report";

export const COMPANIES_DIR = path.join(process.cwd(), "data", "companies");

export function reportPath(ticker: string): string {
  return path.join(COMPANIES_DIR, `${ticker.trim().toUpperCase()}.json`);
}

export function ensureCompaniesDir(): void {
  mkdirSync(COMPANIES_DIR, { recursive: true });
}

/** Load the previously-committed report for a ticker, or null. */
export function loadExisting(ticker: string): CompanyReport | null {
  const p = reportPath(ticker);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as CompanyReport;
  } catch {
    return null;
  }
}

/** Stable fingerprint of an extractor's inputs (for the per-section output cache). */
export function inputHash(...parts: string[]): string {
  return createHash("sha256").update(parts.join("\u0000"), "utf8").digest("hex").slice(0, 16);
}

/**
 * Decide which sections to (re)extract. With an explicit list, only those; else
 * every section. Returns the set to refresh plus the carry-forward source report.
 */
export function refreshPlan(
  existing: CompanyReport | null,
  requested: SectionKey[] | null,
): { refresh: Set<SectionKey>; carry: CompanyReport | null } {
  const all: SectionKey[] = [...SECTION_KEYS];
  if (requested && requested.length) {
    return { refresh: new Set(requested), carry: existing };
  }
  return { refresh: new Set(all), carry: existing ? existing : null };
}

/** URLs already harvested in prior runs — never re-scraped (read-once). */
export function seenUrls(existing: CompanyReport | null): Set<string> {
  return new Set(existing?.sources_seen ?? []);
}
