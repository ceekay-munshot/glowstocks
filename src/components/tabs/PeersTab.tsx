"use client";

import type { CompanyReport, Cited, Peer } from "@/lib/types/report";
import { WidgetCard } from "../WidgetCard";
import { CitedValue } from "../CitedValue";
import { EmptyState } from "../states";
import { Grid } from "./Grid";
import { num } from "@/lib/format";
import { resolveSources } from "@/lib/export/reportModel";
import { seqTint, seqNeedsWhiteText } from "@/lib/palette";

type NumKey =
  | "price" | "mcap" | "pe" | "ev_ebitda" | "roe" | "roce" | "roa"
  | "sales_growth_5y" | "profit_growth_5y" | "de";

const COLS: { key: NumKey; label: string }[] = [
  { key: "price", label: "Price" },
  { key: "mcap", label: "M-cap" },
  { key: "pe", label: "P/E" },
  { key: "ev_ebitda", label: "EV/EBITDA" },
  { key: "roe", label: "ROE" },
  { key: "roce", label: "ROCE" },
  { key: "roa", label: "ROA" },
  { key: "sales_growth_5y", label: "Sales 5Y" },
  { key: "profit_growth_5y", label: "Profit 5Y" },
  { key: "de", label: "D/E" },
];

export function PeersTab({ report }: { report: CompanyReport }) {
  const peers = report.peers.peers;
  if (!peers.length) {
    return (
      <Grid>
        <WidgetCard title="Peer comparison" category="sector" span={3}>
          <EmptyState />
        </WidgetCard>
      </Grid>
    );
  }

  // Per-column min/max for the sequential heat tint (by magnitude within column).
  const stats: Record<string, { min: number; max: number }> = {};
  for (const col of COLS) {
    const vals = peers.map((p) => num(p[col.key] as Cited<number> | undefined)).filter((v): v is number => v !== null);
    if (vals.length) stats[col.key] = { min: Math.min(...vals), max: Math.max(...vals) };
  }

  return (
    <Grid>
      <WidgetCard
        title="Peer comparison"
        subtitle={report.peers.note ?? "Cells shaded by magnitude within each column · hover for source"}
        category="heatmaps"
        span={3}
        bodyPadding={0}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "var(--card-header)" }}>
                <th style={{ ...headCell, textAlign: "left", position: "sticky", left: 0, zIndex: 2, background: "var(--card-header)" }}>Company</th>
                {COLS.map((c) => (
                  <th key={c.key} style={headCell}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {peers.map((p: Peer) => (
                <tr key={p.name}>
                  <td
                    style={{
                      padding: "9px 12px",
                      fontWeight: p.is_self ? 700 : 600,
                      color: "var(--text-primary)",
                      position: "sticky",
                      left: 0,
                      zIndex: 1,
                      background: p.is_self ? "#eef2ff" : "#fff",
                      borderLeft: p.is_self ? "3px solid var(--primary)" : "3px solid transparent",
                      borderBottom: "1px solid var(--border-default)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name}
                    {p.ticker && <span style={{ color: "var(--text-hint)", fontWeight: 400, marginLeft: 6 }}>{p.ticker}</span>}
                  </td>
                  {COLS.map((col) => {
                    const c = p[col.key] as Cited<number> | undefined;
                    const v = num(c);
                    const st = stats[col.key];
                    const tint = v !== null && st ? seqTint(v, st.min, st.max) : "transparent";
                    const white = v !== null && st ? seqNeedsWhiteText(v, st.min, st.max) : false;
                    return (
                      <td key={col.key} style={{ padding: "9px 12px", textAlign: "right", background: tint, borderBottom: "1px solid var(--border-default)", fontVariantNumeric: "tabular-nums" }}>
                        <CitedValue c={c} color={white ? "#fff" : "var(--text-primary)"} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SourcesFooter labels={resolveSources(report, ...peers.flatMap((p) => COLS.map((c) => p[c.key] as Cited<number> | undefined))).labels} />
      </WidgetCard>
    </Grid>
  );
}

/** Compact "Source(s)" line summarising the distinct provenance of a table. */
export function SourcesFooter({ labels }: { labels: string[] }) {
  if (!labels.length) return null;
  return (
    <div style={{ padding: "8px 12px", fontSize: 11, color: "var(--text-hint)", borderTop: "1px solid var(--border-default)" }}>
      Source(s): {labels.join(" · ")}
    </div>
  );
}

const headCell: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "right",
  color: "var(--text-muted)",
  fontWeight: 600,
  whiteSpace: "nowrap",
  borderBottom: "1px solid var(--border-default)",
};
