// Deterministic sanity checks on an assembled report. Impossible figures are set
// to available:false (never shown as wrong data — the "never guess / Not available"
// guardrail), and softer anomalies (revenue ≥ EBITDA ≥ PAT ordering, segment % that
// don't sum to ~100) are returned as warnings for the coverage note / run log.

import type {
  CompanyReport,
  Cited,
  FinancialYear,
  PeriodFinancials,
} from "@/lib/types/report";

function has(c?: Cited<number>): c is Cited<number> {
  return !!c && c.available && typeof c.value === "number" && !Number.isNaN(c.value);
}

/** Null a percentage that falls outside [0, 100] (clearly mis-scaled / wrong). */
function clampPct(c: Cited<number> | undefined, label: string, warnings: string[]): void {
  if (!c || !c.available || typeof c.value !== "number") return;
  if (c.value < 0 || c.value > 100) {
    warnings.push(`${label} = ${c.value}% is outside 0–100 → marked Not available`);
    c.available = false;
    c.value = null;
    c.note = `${c.note ? c.note + "; " : ""}dropped: out of 0–100 range`;
  }
}

function checkPeriod(p: PeriodFinancials | undefined, warnings: string[]): void {
  if (!p) return;
  clampPct(p.ebitda_margin, `${p.period} EBITDA margin`, warnings);
  clampPct(p.ebit_margin, `${p.period} EBIT margin`, warnings);
  clampPct(p.pat_margin, `${p.period} PAT margin`, warnings);
  clampPct(p.roce, `${p.period} ROCE`, warnings);
  clampPct(p.roe, `${p.period} ROE`, warnings);
  // revenue ≥ EBITDA ≥ PAT (soft — one-offs / other income can break it; just flag).
  if (has(p.revenue) && has(p.ebitda) && p.ebitda.value! > p.revenue.value!) {
    warnings.push(`${p.period}: EBITDA (${p.ebitda.value}) > revenue (${p.revenue.value})`);
  }
  if (has(p.ebitda) && has(p.pat) && p.pat.value! > p.ebitda.value! * 1.05) {
    warnings.push(`${p.period}: PAT (${p.pat.value}) > EBITDA (${p.ebitda.value})`);
  }
}

function checkYear(y: FinancialYear, warnings: string[]): void {
  clampPct(y.ebitda_margin, `${y.period} EBITDA margin`, warnings);
  clampPct(y.pat_margin, `${y.period} PAT margin`, warnings);
  if (has(y.revenue) && has(y.pat) && y.pat.value! > y.revenue.value!) {
    warnings.push(`${y.period}: PAT (${y.pat.value}) > revenue (${y.revenue.value})`);
  }
}

export function sanityCheck(report: CompanyReport): string[] {
  const warnings: string[] = [];

  checkPeriod(report.financials?.latest_quarter, warnings);
  checkPeriod(report.financials?.latest_fy, warnings);
  for (const y of report.financials?.history ?? []) checkYear(y, warnings);

  // Segment mix should sum to ~100 (allow 85–115 for rounding / "others").
  const segPct = (report.business?.segments ?? [])
    .map((s) => (s.pct_revenue?.available ? (s.pct_revenue.value ?? 0) : 0))
    .reduce((a, b) => a + b, 0);
  if (report.business?.segments?.length && (segPct < 85 || segPct > 115)) {
    warnings.push(`segment revenue mix sums to ${segPct.toFixed(0)}% (expected ~100%)`);
  }

  // Peer percentages / multiples shouldn't be absurd.
  for (const p of report.peers?.peers ?? []) {
    clampPct(p.roe, `peer ${p.name} ROE`, warnings);
    clampPct(p.roce, `peer ${p.name} ROCE`, warnings);
    clampPct(p.roa, `peer ${p.name} ROA`, warnings);
  }

  return warnings;
}
