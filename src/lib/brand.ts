// glowstocks brand kit — our OWN vivid, coordinated colour system (not grey chrome).
// Every entity keeps ONE fixed colour everywhere; stance / severity / coverage use a
// green→amber→red semantic ramp. Pure values + helpers (safe on server or client).

export const GS = {
  indigo: "#4f46e5",
  blue: "#2563eb",
  sky: "#0284c7",
  cyan: "#0891b2",
  teal: "#0d9488",
  green: "#16a34a",
  lime: "#4d7c0f",
  amber: "#d97706",
  orange: "#ea580c",
  rose: "#e11d48",
  violet: "#7c3aed",
  magenta: "#db2777",
  // semantic (green→amber→red)
  good: "#16a34a",
  warn: "#f59e0b",
  bad: "#dc2626",
  // ink / neutral — used sparingly (secondary text, hairlines), never as chrome
  ink: "#0f172a",
  slate: "#334155",
  grey: "#64748b",
  faint: "#94a3b8",
} as const;

/** Lighten (amt>0) / darken (amt<0) a hex colour by a factor (−1..1). */
export function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => (amt >= 0 ? Math.round(c + (255 - c) * amt) : Math.round(c * (1 + amt)));
  const to2 = (c: number) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0");
  return `#${to2(mix(r))}${to2(mix(g))}${to2(mix(b))}`;
}

export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Soft tint background for an accent (chips, tinted icon squares). */
export const soft = (hex: string, a = 0.12) => withAlpha(hex, a);

/** Green (good, t=0) → amber → red (bad, t=1) solid colour for an intensity 0..1. */
export function rampGYR(t: number): string {
  const c = Math.max(0, Math.min(1, t));
  const stops: [number, [number, number, number]][] = [
    [0, [22, 163, 74]], // green
    [0.5, [245, 158, 11]], // amber
    [1, [220, 38, 38]], // red
  ];
  let a = stops[0];
  let b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (c >= stops[i][0] && c <= stops[i + 1][0]) {
      a = stops[i];
      b = stops[i + 1];
      break;
    }
  }
  const span = b[0] - a[0] || 1;
  const f = (c - a[0]) / span;
  const to2 = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  const ch = [0, 1, 2].map((k) => to2(a[1][k] + (b[1][k] - a[1][k]) * f));
  return `#${ch.join("")}`;
}

/** Categorical series palette — FIXED order, assigned by stable index (never cycled hues). */
export const SERIES = [
  GS.indigo, GS.teal, GS.amber, GS.violet, GS.rose, GS.green, GS.cyan, GS.orange, GS.magenta, GS.blue,
] as const;
export const seriesColor = (i: number): string => SERIES[((i % SERIES.length) + SERIES.length) % SERIES.length];

/** Stance colour (BUY green · HOLD amber · SELL red). */
export function stanceColor(s: string): string {
  if (s === "BUY") return GS.good;
  if (s === "HOLD") return GS.warn;
  if (s === "SELL") return GS.bad;
  return GS.grey;
}

/** Risk / severity level colour (High→red, Medium→amber, Low→green). */
export function levelColor(level: string): string {
  if (level === "High") return GS.bad;
  if (level === "Medium") return GS.warn;
  if (level === "Low") return GS.good;
  return GS.grey;
}

/** Trend direction colour. */
export function trendColor(t: string): string {
  if (t === "growing" || t === "tailwind") return GS.good;
  if (t === "shrinking" || t === "headwind") return GS.bad;
  return GS.grey;
}

/** Integrity check colour. */
export function integrityColor(status: string): string {
  if (status === "pass") return GS.good;
  if (status === "warn") return GS.warn;
  if (status === "fail") return GS.bad;
  return GS.grey;
}

/** A stable vivid 2-stop gradient for a company logo-chip, derived from its ticker. */
export function logoGradient(ticker: string): { from: string; to: string } {
  const pairs: [string, string][] = [
    [GS.indigo, GS.violet],
    [GS.teal, GS.green],
    [GS.amber, GS.rose],
    [GS.blue, GS.cyan],
    [GS.magenta, GS.violet],
    [GS.sky, GS.indigo],
  ];
  let h = 0;
  for (let i = 0; i < ticker.length; i++) h = (h * 31 + ticker.charCodeAt(i)) >>> 0;
  const [from, to] = pairs[h % pairs.length];
  return { from, to };
}

/** Relative "time ago" (exact ISO shown on hover by callers). */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}
