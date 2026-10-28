"use client";

import type { Metric } from "@/lib/types/report";
import { formatValue, NA } from "@/lib/format";
import { kpiAccent } from "@/lib/theme";
import { CiteWrap } from "./CitedValue";

/**
 * One compact, colourful KPI strip — a row of small tinted tiles that wrap,
 * replacing the old wall of big KPI cards. Each figure keeps its source on hover.
 */
export function KpiStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))" }}>
      {metrics.map((m, i) => (
        <KpiTile key={`${m.label}-${i}`} m={m} i={i} />
      ))}
    </div>
  );
}

function KpiTile({ m, i }: { m: Metric; i: number }) {
  const a = kpiAccent(i);
  const available = m.available && m.value !== null && m.value !== undefined;
  const value = available ? formatValue(m.value, m.unit) : NA;

  const delta = m.delta;
  const deltaGood = delta == null ? undefined : (delta.value >= 0) === (delta.good !== false);
  const deltaColor = delta == null ? undefined : deltaGood ? "var(--status-good)" : "var(--status-critical)";

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 12,
        padding: "11px 13px 11px 15px",
        background: `linear-gradient(135deg, ${a.soft} 0%, #ffffff 65%)`,
        border: `1px solid ${a.line}`,
        overflow: "hidden",
        minHeight: 70,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: a.main }} />
      <div style={{ fontSize: 10.5, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {m.label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
        {available ? (
          <CiteWrap c={m}>
            <span style={{ fontSize: 19, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{value}</span>
          </CiteWrap>
        ) : (
          <span style={{ fontSize: 13, fontStyle: "italic", color: "var(--text-hint)" }}>{NA}</span>
        )}
        {delta && (
          <span style={{ fontSize: 11, fontWeight: 700, color: deltaColor }}>
            {delta.value > 0 ? "▲" : delta.value < 0 ? "▼" : "•"} {Math.abs(delta.value)}
            {delta.unit ?? ""}
          </span>
        )}
      </div>
    </div>
  );
}
