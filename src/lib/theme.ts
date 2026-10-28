// VIVID UI theme map (chrome only — NOT chart data). Per-tab and per-section
// accent colours + icon names drive the colourful, icon-rich dashboard. These
// accents are UI chrome (tab underlines, section headers, icon chips, KPI
// tiles); the CHARTS keep the dataviz-validated SERIES palette in palette.ts,
// which is unchanged. Pure data — safe to import from server or client.

import type { IconName } from "@/components/Icon";
import type { SectionKey } from "@/lib/types/report";

export interface Accent {
  /** Saturated ink for titles / underlines / icons (AA-ish on white at ≥600). */
  main: string;
  /** Soft tint for header backgrounds and chips. */
  soft: string;
  /** Slightly deeper tint border. */
  line: string;
}

export interface TabMeta {
  key: TabKey;
  /** Full tab label. */
  label: string;
  /** Compact label for narrow tab rails. */
  short: string;
  icon: IconName;
  accent: Accent;
}

export type TabKey =
  | "snapshot"
  | "business"
  | "customers"
  | "financials"
  | "growth"
  | "peers"
  | "thesis"
  | "sources";

const A = (main: string, soft: string, line: string): Accent => ({ main, soft, line });

/** Eight distinct, vivid, legible accents — one per tab. */
export const TABS: TabMeta[] = [
  { key: "snapshot", label: "Snapshot", short: "Snapshot", icon: "gauge", accent: A("#2563eb", "#eff6ff", "#dbeafe") },
  { key: "business", label: "Business", short: "Business", icon: "layers", accent: A("#7c3aed", "#f5f3ff", "#ede9fe") },
  { key: "customers", label: "Customers & Capacity", short: "Customers", icon: "users", accent: A("#0d9488", "#f0fdfa", "#99f6e4") },
  { key: "financials", label: "Financials", short: "Financials", icon: "bars", accent: A("#d97706", "#fffbeb", "#fde68a") },
  { key: "growth", label: "Growth & Concall", short: "Growth", icon: "rocket", accent: A("#16a34a", "#f0fdf4", "#bbf7d0") },
  { key: "peers", label: "Peers & Estimates", short: "Peers", icon: "scale", accent: A("#4f46e5", "#eef2ff", "#e0e7ff") },
  { key: "thesis", label: "Thesis & Risks", short: "Thesis", icon: "balance", accent: A("#e11d48", "#fff1f2", "#fecdd3") },
  { key: "sources", label: "Sources & Integrity", short: "Sources", icon: "shieldCheck", accent: A("#475569", "#f8fafc", "#e2e8f0") },
];

export const TAB_MAP: Record<TabKey, TabMeta> = Object.fromEntries(
  TABS.map((t) => [t.key, t]),
) as Record<TabKey, TabMeta>;

/** Accent + icon for each section (used in composite-tab section headers). */
export const SECTION_META: Record<SectionKey, { label: string; icon: IconName; accent: Accent }> = {
  snapshot: { label: "Snapshot", icon: "gauge", accent: A("#2563eb", "#eff6ff", "#dbeafe") },
  business: { label: "Business mix", icon: "layers", accent: A("#7c3aed", "#f5f3ff", "#ede9fe") },
  financials: { label: "Financials", icon: "bars", accent: A("#d97706", "#fffbeb", "#fde68a") },
  peers: { label: "Peer comparison", icon: "scale", accent: A("#4f46e5", "#eef2ff", "#e0e7ff") },
  thesis: { label: "Investment thesis", icon: "balance", accent: A("#2563eb", "#eff6ff", "#dbeafe") },
  customers: { label: "Customers & order book", icon: "users", accent: A("#0d9488", "#f0fdfa", "#99f6e4") },
  capacity: { label: "Capacity & footprint", icon: "factory", accent: A("#0284c7", "#f0f9ff", "#bae6fd") },
  growth: { label: "Growth drivers", icon: "rocket", accent: A("#16a34a", "#f0fdf4", "#bbf7d0") },
  concall: { label: "Earnings call", icon: "mic", accent: A("#7c3aed", "#f5f3ff", "#ede9fe") },
  mna: { label: "M&A & inorganic", icon: "handshake", accent: A("#0d9488", "#f0fdfa", "#99f6e4") },
  estimates: { label: "Street estimates", icon: "target", accent: A("#d97706", "#fffbeb", "#fde68a") },
  risks: { label: "Risk register", icon: "shield", accent: A("#e11d48", "#fff1f2", "#fecdd3") },
  integrity: { label: "Data integrity", icon: "shieldCheck", accent: A("#16a34a", "#f0fdf4", "#bbf7d0") },
};

/** Coverage colour by how complete a report is (0–1). */
export function coverageAccent(done: number, total: number): Accent {
  const r = total ? done / total : 0;
  if (r >= 0.99) return A("#16a34a", "#f0fdf4", "#bbf7d0"); // complete → green
  if (r >= 0.6) return A("#d97706", "#fffbeb", "#fde68a"); // partial → amber
  return A("#e11d48", "#fff1f2", "#fecdd3"); // thin → rose
}

/** A deterministic vivid accent for a KPI tile, cycling the tab palette. */
const KPI_CYCLE: Accent[] = [
  A("#2563eb", "#eff6ff", "#dbeafe"),
  A("#0d9488", "#f0fdfa", "#99f6e4"),
  A("#7c3aed", "#f5f3ff", "#ede9fe"),
  A("#d97706", "#fffbeb", "#fde68a"),
  A("#16a34a", "#f0fdf4", "#bbf7d0"),
  A("#4f46e5", "#eef2ff", "#e0e7ff"),
];
export function kpiAccent(i: number): Accent {
  return KPI_CYCLE[i % KPI_CYCLE.length];
}

/** Relative "time ago" label (exact ISO shown on hover by callers). */
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

/** A stable vivid gradient for a company logo-chip, derived from its ticker. */
export function logoGradient(ticker: string): { from: string; to: string } {
  const pairs = [
    { from: "#2563eb", to: "#7c3aed" },
    { from: "#0d9488", to: "#16a34a" },
    { from: "#d97706", to: "#e11d48" },
    { from: "#4f46e5", to: "#0891b2" },
    { from: "#db2777", to: "#7c3aed" },
    { from: "#0284c7", to: "#2563eb" },
  ];
  let h = 0;
  for (let i = 0; i < ticker.length; i++) h = (h * 31 + ticker.charCodeAt(i)) >>> 0;
  return pairs[h % pairs.length];
}
