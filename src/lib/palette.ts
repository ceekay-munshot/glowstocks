// The dataviz skill's VALIDATED default palette (light surface). Validated with
// scripts/validate_palette.js — ALL CHECKS PASS. Categorical hues are used in
// FIXED ORDER and never cycled; a 9th series folds into "Other". Charts always
// ship a legend + direct labels + a table/Sources view, which satisfies the
// light-mode "relief rule" for the sub-3:1 hues (aqua/yellow/magenta).

/** Categorical slots 1–8, fixed order. */
export const SERIES = [
  "#2a78d6", // 1 blue
  "#eb6834", // 2 orange
  "#1baf7a", // 3 aqua
  "#eda100", // 4 yellow
  "#e87ba4", // 5 magenta
  "#008300", // 6 green
  "#4a3aa7", // 7 violet
  "#e34948", // 8 red
] as const;

/** Status palette (fixed — always paired with an icon + label, never color-alone). */
export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
} as const;

/** Sequential blue ramp (heat tables / magnitude). Light → dark. */
export const SEQ = ["#cde2fb", "#86b6ef", "#3987e5", "#1c5cab", "#0d366b"] as const;

/** Diverging poles for polarity (support ↔ counter, growing ↔ shrinking). */
export const DIVERGE = { pos: "#2a78d6", neg: "#e34948", mid: "#f0efec" } as const;

/** Chart chrome & ink (light). */
export const INK = {
  surface: "#fcfcfb",
  primary: "#0b0b0b",
  secondary: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
} as const;

/** Pick a categorical color by index (folds past 8 → last slot; never invents hues). */
export function seriesColor(i: number): string {
  return SERIES[Math.min(i, SERIES.length - 1)];
}

/** A sequential background tint for a value within [min,max] (heat-table cells). */
export function seqTint(value: number, min: number, max: number): string {
  if (max <= min) return SEQ[0];
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  // Map t → one of 5 steps; light (near min) → dark (near max).
  return SEQ[Math.min(SEQ.length - 1, Math.round(t * (SEQ.length - 1)))];
}

/** Is a seq step dark enough to need white text? (last two steps). */
export function seqNeedsWhiteText(value: number, min: number, max: number): boolean {
  if (max <= min) return false;
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return Math.round(t * (SEQ.length - 1)) >= 3;
}

export const TREND_COLOR: Record<string, string> = {
  growing: STATUS.good,
  shrinking: STATUS.critical,
  stable: INK.muted,
  "Not available": INK.muted,
};

export const STANCE_COLOR: Record<string, string> = {
  BUY: "#0ca30c",
  HOLD: "#eda100",
  SELL: "#d03b3b",
  "Not available": "#898781",
};
