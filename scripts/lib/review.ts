// Read-back review pass. Reconciles cross-section contradictions DETERMINISTICALLY
// (cheaper and safer than a second model call — and it never burns credits): where
// a Snapshot KPI and the detailed Financials disagree on the same figure, the
// Snapshot is aligned to the more-detailed Financials value. Softening only — it
// aligns a headline figure to its authoritative source, never invents or lowers a
// correct value.

import type { CompanyReport, Metric, Cited } from "@/lib/types/report";

function val(c?: Cited<number>): number | null {
  return c && c.available && typeof c.value === "number" ? c.value : null;
}

/** Does the KPI label name this metric? (loose, case-insensitive). */
function labelMatches(label: string, ...keys: string[]): boolean {
  const l = label.toLowerCase();
  return keys.some((k) => l.includes(k));
}

function alignKpi(kpi: Metric, authoritative: number, source: Cited<number>, note: string, out: string[]): void {
  const cur = typeof kpi.value === "number" ? kpi.value : null;
  if (cur === null) return;
  const diff = Math.abs(cur - authoritative);
  const rel = authoritative !== 0 ? diff / Math.abs(authoritative) : diff;
  if (rel > 0.05) {
    out.push(`Snapshot "${kpi.label}" ${cur} → ${authoritative} (aligned to Financials)`);
    kpi.value = authoritative;
    if (source.source) kpi.source = source.source;
    if (source.url) kpi.url = source.url;
    if (source.date) kpi.date = source.date;
    kpi.note = `${kpi.note ? kpi.note + "; " : ""}${note}`;
  }
}

export function reviewReport(report: CompanyReport): string[] {
  const corrections: string[] = [];
  const fy = report.financials?.latest_fy;
  if (!fy) return corrections;

  const revenue = val(fy.revenue);
  const pat = val(fy.pat);

  for (const kpi of report.snapshot?.kpis ?? []) {
    if (typeof kpi.value !== "number") continue;
    if (revenue !== null && labelMatches(kpi.label, "revenue", "sales", "turnover") && !/growth|yoy|margin/i.test(kpi.label)) {
      alignKpi(kpi, revenue, fy.revenue, `aligned to ${fy.period} revenue`, corrections);
    } else if (pat !== null && labelMatches(kpi.label, "pat", "net profit", "profit after tax") && !/margin|growth/i.test(kpi.label)) {
      alignKpi(kpi, pat, fy.pat, `aligned to ${fy.period} PAT`, corrections);
    }
  }

  // Thesis stance should match the Snapshot stance.
  if (
    report.thesis &&
    report.snapshot &&
    report.thesis.stance !== report.snapshot.stance &&
    report.snapshot.stance !== "Not available"
  ) {
    corrections.push(`Thesis stance ${report.thesis.stance} → ${report.snapshot.stance} (aligned to Snapshot)`);
    report.thesis.stance = report.snapshot.stance;
  }

  return corrections;
}
