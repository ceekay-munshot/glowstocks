"use client";

import { useState } from "react";
import type { CompanyReport, PeriodFinancials } from "@/lib/types/report";
import { WidgetCard } from "../WidgetCard";
import { CitedValue } from "../CitedValue";
import { EChart } from "../charts/EChart";
import { EmptyState } from "../states";
import { Grid } from "./Grid";
import { financialsBarsOption, marginsLineOption } from "@/lib/charts";

const METRIC_ROWS: { key: keyof PeriodFinancials; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "ebitda", label: "EBITDA" },
  { key: "ebitda_margin", label: "EBITDA margin" },
  { key: "ebit_margin", label: "EBIT margin" },
  { key: "pat", label: "PAT" },
  { key: "pat_margin", label: "PAT margin" },
  { key: "ocf", label: "Operating cash flow" },
  { key: "fcf", label: "Free cash flow" },
  { key: "net_debt", label: "Net debt (−ve = net cash)" },
  { key: "roce", label: "ROCE" },
  { key: "roe", label: "ROE" },
];

function PeriodTable({ p }: { p: PeriodFinancials }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <tbody>
        {METRIC_ROWS.map((row) => {
          const c = p[row.key] as { available?: boolean } | undefined;
          if (!c) return null;
          return (
            <tr key={row.key} style={{ borderBottom: "1px solid var(--border-default)" }}>
              <td style={{ padding: "7px 0", color: "var(--text-muted)" }}>{row.label}</td>
              <td style={{ padding: "7px 0", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                <CitedValue c={p[row.key] as never} bold />
              </td>
            </tr>
          );
        })}
        {p.one_offs && (
          <tr>
            <td style={{ padding: "7px 0", color: "var(--text-muted)" }}>One-offs</td>
            <td style={{ padding: "7px 0", textAlign: "right", color: "var(--text-secondary)" }}>{p.one_offs}</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export function FinancialsTab({ report }: { report: CompanyReport }) {
  const f = report.financials;
  const history = f?.history ?? [];
  const [period, setPeriod] = useState<"quarter" | "annual">(f?.latest_quarter ? "quarter" : "annual");
  const current = period === "quarter" ? f?.latest_quarter : f?.latest_fy;

  const toggle = (
    <div style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 8, padding: 2 }}>
      {(["quarter", "annual"] as const).map((p) => {
        const on = period === p;
        const disabled = p === "quarter" ? !f?.latest_quarter : !f?.latest_fy;
        return (
          <button
            key={p}
            onClick={() => !disabled && setPeriod(p)}
            disabled={disabled}
            style={{
              border: "none",
              borderRadius: 6,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 600,
              cursor: disabled ? "not-allowed" : "pointer",
              background: on ? "#fff" : "transparent",
              color: on ? "var(--primary)" : "var(--text-muted)",
              boxShadow: on ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              opacity: disabled ? 0.4 : 1,
            }}
          >
            {p === "quarter" ? "Qtr" : "Year"}
          </button>
        );
      })}
    </div>
  );

  return (
    <Grid>
      <WidgetCard
        title="Latest period"
        subtitle={current?.period ?? "—"}
        category="markets"
        action={f?.latest_quarter && f?.latest_fy ? toggle : undefined}
      >
        {current ? <PeriodTable p={current} /> : <EmptyState />}
      </WidgetCard>

      <WidgetCard title="Revenue, EBITDA & PAT" subtitle="5-year history · INR crore" category="markets" span={2}>
        {history.length ? <EChart option={financialsBarsOption(history)} height={300} /> : <EmptyState />}
      </WidgetCard>

      <WidgetCard title="Margins" subtitle="EBITDA & PAT margin · %" category="analytics" span={2}>
        {history.length ? <EChart option={marginsLineOption(history)} height={280} /> : <EmptyState />}
      </WidgetCard>

      <WidgetCard title="5-year table" subtitle="Hover any figure for its source" category="markets" span={3} bodyPadding={0}>
        {history.length ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-default)", background: "var(--card-header)" }}>
                  {["Year", "Revenue", "EBITDA", "EBITDA %", "PAT", "PAT %", "EPS"].map((h, i) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: i === 0 ? "left" : "right", color: "var(--text-muted)", fontWeight: 600, position: i === 0 ? "sticky" : undefined, left: i === 0 ? 0 : undefined, background: "var(--card-header)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((y) => (
                  <tr key={y.period} style={{ borderBottom: "1px solid var(--border-default)" }}>
                    <td style={{ padding: "9px 14px", fontWeight: 600, color: "var(--text-primary)", position: "sticky", left: 0, background: "#fff" }}>{y.period}</td>
                    <td style={cellR}><CitedValue c={y.revenue} /></td>
                    <td style={cellR}><CitedValue c={y.ebitda ?? null} /></td>
                    <td style={cellR}><CitedValue c={y.ebitda_margin ?? null} /></td>
                    <td style={cellR}><CitedValue c={y.pat} /></td>
                    <td style={cellR}><CitedValue c={y.pat_margin ?? null} /></td>
                    <td style={cellR}><CitedValue c={y.eps ?? null} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState />
        )}
      </WidgetCard>
    </Grid>
  );
}

const cellR: React.CSSProperties = { padding: "9px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" };
