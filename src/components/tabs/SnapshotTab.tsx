"use client";

import type { CompanyReport } from "@/lib/types/report";
import { WidgetCard } from "../WidgetCard";
import { Kpi } from "../Kpi";
import { StancePill } from "../Stance";
import { EChart } from "../charts/EChart";
import { EmptyState } from "../states";
import { Grid } from "./Grid";
import { financialsBarsOption } from "@/lib/charts";

export function SnapshotTab({ report }: { report: CompanyReport }) {
  const s = report.snapshot;
  const history = report.financials?.history ?? [];

  return (
    <Grid>
      {/* Stance hero */}
      <WidgetCard title="Stance" subtitle={`As of ${report.as_of}`} category="analytics">
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 120, justifyContent: "center" }}>
          <StancePill stance={s.stance} size="lg" />
          {s.stance_rationale && (
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{s.stance_rationale}</p>
          )}
        </div>
      </WidgetCard>

      {/* Business model */}
      <WidgetCard title="Business model" subtitle={[s.sector, s.industry].filter(Boolean).join(" · ") || report.exchange} category="india" span={2}>
        {s.business_model && s.business_model !== "Not available" ? (
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>{s.business_model}</p>
        ) : (
          <EmptyState />
        )}
      </WidgetCard>

      {/* Headline KPIs */}
      <WidgetCard title="Headline KPIs" subtitle="Hover any figure for its source" category="markets" span={3}>
        {s.kpis.length ? (
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
            {s.kpis.map((m, i) => (
              <Kpi key={`${m.label}-${i}`} m={m} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </WidgetCard>

      {/* Revenue & profit trend (snapshot view) */}
      <WidgetCard title="Revenue, EBITDA & PAT" subtitle="Last 5 financial years · INR crore" category="markets" span={2}>
        {history.length ? <EChart option={financialsBarsOption(history)} height={260} /> : <EmptyState />}
      </WidgetCard>
    </Grid>
  );
}
