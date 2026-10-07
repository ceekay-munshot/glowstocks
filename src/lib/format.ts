// Shared formatting for Indian financial figures. Used by the UI and the exports
// so numbers read identically everywhere.

import type { Cited } from "@/lib/types/report";

export const NA = "Not available";

/** Indian digit grouping: 1,41,00,00,000 style (xx,xx,xxx). */
export function indianGroup(n: number): string {
  const neg = n < 0;
  const abs = Math.abs(Math.round(n));
  const s = String(abs);
  if (s.length <= 3) return (neg ? "-" : "") + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return (neg ? "-" : "") + grouped + "," + last3;
}

/** INR crore, compacted to lakh-crore (L cr) above ₹1 lakh crore. */
export function fmtCr(v: number): string {
  const neg = v < 0 ? "-" : "";
  const a = Math.abs(v);
  if (a >= 100000) return `${neg}₹${(a / 100000).toFixed(2)}L cr`;
  if (a >= 1000) return `${neg}₹${indianGroup(a)} cr`;
  return `${neg}₹${a.toFixed(a < 10 ? 1 : 0)} cr`;
}

export function fmtPrice(v: number): string {
  return `₹${indianGroup(v)}`;
}
export function fmtPct(v: number): string {
  return `${v.toFixed(1)}%`;
}
export function fmtX(v: number): string {
  return `${v.toFixed(1)}x`;
}

/** Group an integer with Indian digit grouping; keep up to 2 decimals otherwise. */
function plainNum(v: number): string {
  return Number.isInteger(v) ? indianGroup(v) : v.toFixed(2).replace(/\.?0+$/, "");
}

/**
 * Route a numeric value to the right display by its unit. The switch is
 * exhaustive for every unit the contract uses, and ANY unknown non-empty unit
 * falls through to "<number> <unit>" — so a ratio, a count of months, or a
 * headcount is never silently rendered as ₹ crore. Keep ALL value rendering
 * (screen, PDF, Excel labels) going through here.
 */
export function formatValue(value: number | string | null, unit?: string): string {
  if (value === null || value === undefined) return NA;
  if (typeof value === "string") return value;
  const u = (unit ?? "").trim();
  switch (u) {
    case "INR cr":
    case "₹ cr":
    case "cr":
      return fmtCr(value);
    case "INR":
    case "₹":
      return fmtPrice(value);
    case "%":
      return fmtPct(value);
    case "x":
    case "ratio":
      return fmtX(value);
    case "pp":
      return `${value > 0 ? "+" : ""}${value.toFixed(1)}pp`;
    case "bps":
      return `${value > 0 ? "+" : ""}${Math.round(value)} bps`;
    case "months":
    case "days":
    case "years":
    case "weeks":
      return `${plainNum(value)} ${u}`;
    case "":
      return plainNum(value);
    default:
      // Unknown unit (headcount, centres, countries, …): keep the number
      // readable and append the unit rather than guessing a currency format.
      return `${plainNum(value)} ${u}`;
  }
}

/** Display string for a cited datum ("Not available" when absent). */
export function citedText(c?: Cited<number | string> | null): string {
  if (!c || !c.available || c.value === null || c.value === undefined) return NA;
  return formatValue(c.value, c.unit);
}

/** Compact axis label for a crore value (₹ cr), e.g. 255324 → "2.6L". */
export function axisCr(v: number): string {
  const a = Math.abs(v);
  if (a >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (a >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return String(Math.round(v));
}

/** One-line provenance string for tooltips / exports. */
export function citationLine(c?: Cited<number | string> | null): string {
  if (!c || !c.available) return NA;
  const bits = [c.source, c.date ?? undefined, c.locator ?? undefined].filter(Boolean);
  return bits.join(" · ") || "source on file";
}

export const num = (c?: Cited<number> | null): number | null =>
  c && c.available && typeof c.value === "number" ? c.value : null;
