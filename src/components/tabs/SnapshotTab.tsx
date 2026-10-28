"use client";

import type { CompanyReport } from "@/lib/types/report";
import { WidgetCard } from "../WidgetCard";
import { KpiStrip } from "../KpiStrip";
import { StancePill } from "../Stance";
import { EChart } from "../charts/EChart";
import { EmptyState } from "../states";
import { Grid } from "./Grid";
import { financialsBarsOption, marginsLineOption } from "@/lib/charts";

export function SnapshotTab({ report }: { report: CompanyReport }) {
  const s = report.snapshot;
  const history = report.financials?.history ?? [];

  return (
    <Grid>
      {/* Stance hero */}
      <WidgetCard title="Our stance" subtitle={`As of ${report.as_of}`} icon="flag">
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 130, justifyContent: "center" }}>
          <StancePill stance={s.stance} size="lg" />
          {s.stance_rationale && (
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>{s.stance_rationale}</p>
          )}
        </div>
      </WidgetCard>

      {/* Business model */}
      <WidgetCard title="Business model" subtitle={[s.sector, s.industry].filter(Boolean).join(" · ") || report.exchange} icon="building" span={2}>
        {s.business_model && s.business_model !== "Not available" ? (
          <p style={{ margin: 0, fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.65 }}>{s.business_model}</p>
        ) : (
          <EmptyState />
        )}
      </WidgetCard>

      {/* Headline KPIs — one compact colour strip */}
      <WidgetCard title="Headline KPIs" subtitle="Hover any figure for its source" icon="gauge" span={3}>
        {s.kpis.length ? <KpiStrip metrics={s.kpis} /> : <EmptyState />}
      </WidgetCard>

      {/* Charts lead */}
      <WidgetCard title="Revenue, EBITDA & PAT" subtitle="Last 5 financial years · INR crore" icon="bars" span={2}>
        {history.length ? <EChart option={financialsBarsOption(history)} height={280} /> : <EmptyState />}
      </WidgetCard>

      <WidgetCard title="Margin trend" subtitle="EBITDA & PAT margin · %" icon="trendUp">
        {history.length ? <EChart option={marginsLineOption(history)} height={280} /> : <EmptyState />}
      </WidgetCard>
    </Grid>
  );
}
