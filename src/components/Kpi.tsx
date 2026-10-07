import type { Metric } from "@/lib/types/report";
import { formatValue, NA } from "@/lib/format";
import { CiteWrap } from "./CitedValue";

/** Stat tile: label · value (semibold) · optional delta chip · source on hover. */
export function Kpi({ m }: { m: Metric }) {
  const available = m.available && m.value !== null && m.value !== undefined;
  const value = available ? formatValue(m.value, m.unit) : NA;

  const delta = m.delta;
  const deltaColor =
    delta == null
      ? undefined
      : (delta.value >= 0) === (delta.good !== false)
        ? "var(--status-good)"
        : "var(--status-critical)";

  return (
    <div
      style={{
        border: "1px solid var(--border-default)",
        borderRadius: 12,
        padding: "12px 14px",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minHeight: 84,
      }}
    >
      <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>{m.label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        {available ? (
          <CiteWrap c={m}>
            <span style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>{value}</span>
          </CiteWrap>
        ) : (
          <span style={{ fontSize: 15, fontStyle: "italic", color: "var(--text-hint)" }}>{NA}</span>
        )}
        {delta && (
          <span style={{ fontSize: 11, fontWeight: 600, color: deltaColor }}>
            {delta.value > 0 ? "▲" : delta.value < 0 ? "▼" : "•"} {Math.abs(delta.value)}
            {delta.unit ?? ""} {delta.period ? <span style={{ color: "var(--text-hint)", fontWeight: 400 }}>{delta.period}</span> : null}
          </span>
        )}
      </div>
    </div>
  );
}
