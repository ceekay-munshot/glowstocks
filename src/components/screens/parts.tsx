"use client";

import type { ReactNode } from "react";
import type { Cited, CompanyReport, Delta, Metric, Stance } from "@/lib/types/report";
import { MiniStat } from "../ui/Card";
import { CiteWrap } from "../CitedValue";
import { formatValue, NA, cleanSource } from "@/lib/format";
import { resolveSources } from "@/lib/export/reportModel";
import { GS, stanceColor } from "@/lib/brand";

/** A single tight stat strip (never a KPI wall). */
export function StatStrip({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">{children}</div>;
}

/** A signed trend chip that keeps its comparison period ("+12.5% vs FY23"). The
 *  colour reads direction × sentiment: favourable → green, adverse → red. */
function DeltaChip({ d }: { d: Delta }) {
  const raw = formatValue(d.value, d.unit); // routes through the one formatter (pp/bps already signed)
  const body = d.value > 0 && !raw.startsWith("+") ? `+${raw}` : raw;
  const upIsGood = d.good ?? true; // default convention: an up-move is favourable
  const fav = d.value === 0 ? null : d.value > 0 ? upIsGood : !upIsGood;
  const color = fav === null ? GS.grey : fav ? GS.good : GS.bad;
  // The period may arrive bare ("FY24") or already prefixed ("vs FY24") — normalise
  // so we never render a doubled "vs vs FY24".
  const period = d.period?.replace(/^vs\s+/i, "").trim();
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1">
      <span className="font-bold" style={{ color }}>{body}</span>
      {period && <span className="text-grey">vs {period}</span>}
    </span>
  );
}

/** MiniStat from a cited Metric, with source-on-hover and an optional trend chip. */
export function MetricStat({ m, color }: { m: Metric; color: string }) {
  const ok = m.available && m.value !== null && m.value !== undefined;
  return (
    <MiniStat
      label={m.label}
      color={color}
      value={ok ? <CiteWrap c={m}>{formatValue(m.value, m.unit)}</CiteWrap> : <span className="text-[14px] italic text-grey">{NA}</span>}
      sub={ok && m.delta ? <DeltaChip d={m.delta} /> : undefined}
    />
  );
}

/** Compact "Source(s): …" provenance line for a multi-value card. */
export function SourceFooter({ report, cs }: { report: CompanyReport; cs: (Cited<number | string> | null | undefined)[] }) {
  const labels = resolveSources(report, ...cs).labels.map(cleanSource);
  if (!labels.length) return null;
  return <p className="mt-2 text-[11px] text-grey">Source(s): {labels.join(" · ")}</p>;
}

/** Coloured stance tag (BUY/HOLD/SELL) — tinted bg + bold brand-coloured text. */
export function StanceTag({ stance, large = false }: { stance: Stance; large?: boolean }) {
  const c = stanceColor(stance);
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full font-extrabold"
      style={{ background: `${c}1c`, color: c, padding: large ? "7px 18px" : "3px 11px", fontSize: large ? 19 : 12.5 }}
    >
      <span className="rounded-full" style={{ background: c, width: large ? 10 : 7, height: large ? 10 : 7 }} />
      {stance}
    </span>
  );
}

/** Screen wrapper — fade-up entrance + vertical rhythm. */
export function Screen({ children }: { children: ReactNode }) {
  return <div className="animate-fade-up space-y-4">{children}</div>;
}
