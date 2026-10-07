"use client";

import type { CompanyReport, Trend } from "@/lib/types/report";
import { WidgetCard } from "../WidgetCard";
import { CitedValue } from "../CitedValue";
import { EChart } from "../charts/EChart";
import { EmptyState } from "../states";
import { Grid } from "./Grid";
import { segmentsDonutOption, geographyBarsOption } from "@/lib/charts";
import { TREND_COLOR } from "@/lib/palette";

function TrendChip({ trend }: { trend: Trend }) {
  const color = TREND_COLOR[trend] ?? TREND_COLOR.stable;
  const arrow = trend === "growing" ? "▲" : trend === "shrinking" ? "▼" : "▬";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color, padding: "2px 8px", borderRadius: 99, background: `${color}14` }}>
      {arrow} {trend}
    </span>
  );
}

export function BusinessTab({ report }: { report: CompanyReport }) {
  const b = report.business;
  const hasSeg = b.segments.length > 0;
  const hasGeo = b.geographies.length > 0;

  return (
    <Grid>
      <WidgetCard title="Revenue mix by segment" subtitle={b.summary ?? "Share of revenue"} category="analytics">
        {hasSeg ? <EChart option={segmentsDonutOption(b.segments)} height={300} /> : <EmptyState />}
      </WidgetCard>

      <WidgetCard title="Segments" subtitle="Share of revenue · trend" category="sector" span={2} bodyPadding={0}>
        {hasSeg ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-default)", background: "var(--card-header)" }}>
                <th style={th}>Segment</th>
                <th style={{ ...th, textAlign: "right" }}>% revenue</th>
                <th style={{ ...th, textAlign: "right" }}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {b.segments.map((seg) => (
                <tr key={seg.name} style={{ borderBottom: "1px solid var(--border-default)" }}>
                  <td style={{ padding: "9px 14px" }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{seg.name}</div>
                    {seg.note && <div style={{ fontSize: 11, color: "var(--text-hint)" }}>{seg.note}</div>}
                  </td>
                  <td style={{ padding: "9px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    <CitedValue c={seg.pct_revenue} bold />
                  </td>
                  <td style={{ padding: "9px 14px", textAlign: "right" }}>
                    <TrendChip trend={seg.trend} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState />
        )}
      </WidgetCard>

      <WidgetCard title="Revenue by geography" subtitle="Share of revenue · hover for driver & risk" category="markets" span={2}>
        {hasGeo ? <EChart option={geographyBarsOption(b.geographies)} height={Math.max(220, b.geographies.length * 46)} /> : <EmptyState />}
      </WidgetCard>

      <WidgetCard title="Geography — drivers & risks" category="sector">
        {hasGeo ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {b.geographies.map((g) => (
              <div key={g.region} style={{ fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, color: "var(--text-primary)" }}>
                  <span>{g.region}</span>
                  <CitedValue c={g.pct_revenue} />
                </div>
                {g.driver && <div style={{ color: "var(--status-good)" }}>↑ {g.driver}</div>}
                {g.risk && <div style={{ color: "var(--status-critical)" }}>↓ {g.risk}</div>}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </WidgetCard>
    </Grid>
  );
}

const th: React.CSSProperties = { padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 };
