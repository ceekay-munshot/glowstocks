// Reports committed to the repo at build time are bundled into the Worker, so the
// dashboard renders them with ZERO network calls and ZERO keys — this is what lets
// the committed SAMPLE (TCS) and the real INFY report show with no secrets set.
// Add a committed company here to bundle it; anything not bundled is read live via
// githubReports.

import { SECTION_KEYS, type CompanyReport } from "@/lib/types/report";
import tcs from "../../data/companies/TCS.json";
import infy from "../../data/companies/INFY.json";

const BUNDLED: Record<string, CompanyReport> = {
  TCS: tcs as unknown as CompanyReport,
  INFY: infy as unknown as CompanyReport,
};

export const SAMPLE_TICKER = "TCS";

export function getBundledReport(ticker: string): CompanyReport | null {
  return BUNDLED[ticker.trim().toUpperCase()] ?? null;
}

/** A compact row for the landing "Previous runs" table — no full report needed. */
export interface CompanyRow {
  ticker: string;
  company: string;
  exchange: string;
  is_sample: boolean;
  last_updated: string;
  as_of: string;
  stance: string;
  sector?: string;
  industry?: string;
  sources: number;
  coverageDone: number;
  coverageTotal: number;
}

/** Collapse a full report to a compact landing-table row. Shared by the bundled
 *  list and by the client-side recent-runs store (live-researched companies). */
export function reportToRow(r: CompanyReport): CompanyRow {
  const cov = (r.coverage ?? {}) as unknown as Record<string, boolean | undefined>;
  const done = SECTION_KEYS.filter((k) => cov[k]).length;
  return {
    ticker: r.ticker,
    company: r.company,
    exchange: r.exchange,
    is_sample: !!r.is_sample,
    last_updated: r.last_updated,
    as_of: r.as_of,
    stance: r.snapshot?.stance ?? "Not available",
    sector: r.snapshot?.sector,
    industry: r.snapshot?.industry,
    sources: r.sources?.length ?? 0,
    coverageDone: done,
    coverageTotal: SECTION_KEYS.length,
  };
}

/** Every researched company available offline (bundled/committed). */
export function knownCompanies(): CompanyRow[] {
  return Object.values(BUNDLED).map(reportToRow);
}
