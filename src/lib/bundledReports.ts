// Reports committed to the repo at build time are bundled into the Worker, so the
// dashboard renders them with ZERO network calls and ZERO keys — this is what lets
// the committed SAMPLE (TCS) show before any secret is set. Add a committed
// company here to bundle it; anything not bundled is read live via githubReports.

import type { CompanyReport } from "@/lib/types/report";
import tcs from "../../data/companies/TCS.json";

const BUNDLED: Record<string, CompanyReport> = {
  TCS: tcs as unknown as CompanyReport,
};

export const SAMPLE_TICKER = "TCS";

export function getBundledReport(ticker: string): CompanyReport | null {
  return BUNDLED[ticker.trim().toUpperCase()] ?? null;
}

export function bundledCompanies(): { ticker: string; company: string; is_sample?: boolean }[] {
  return Object.values(BUNDLED).map((r) => ({
    ticker: r.ticker,
    company: r.company,
    is_sample: r.is_sample,
  }));
}
