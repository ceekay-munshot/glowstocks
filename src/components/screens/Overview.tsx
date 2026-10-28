"use client";

import { Gauge, Layers, Globe2, TrendingUp } from "lucide-react";
import type { CompanyReport } from "@/lib/types/report";
import { GS, seriesColor, trendColor } from "@/lib/brand";
import { fmtCr, fmtPct, num, axisCr } from "@/lib/format";
import { Card, CardHeader, PageHeader, Badge } from "../ui/Card";
import { Table, type Column } from "../ui/Table";
import { EmptyState } from "../ui/States";
import { CitedValue } from "../CitedValue";
import { GroupedColumns } from "../charts/GroupedColumns";
import { Lines } from "../charts/Lines";
import { Donut } from "../charts/Donut";
import { HBars } from "../charts/HBars";
import { Screen, StatStrip, MetricStat, StanceTag, SourceFooter } from "./parts";

const moneyAxis = (v: number) => `₹${axisCr(v)}`;

function HistoryCharts({ report }: { report: CompanyReport }) {
  const history = report.financials?.history ?? [];
  if (!history.length) return null;
  const groups = history.map((y) => ({ label: y.period, values: { revenue: num(y.revenue), ebitda: num(y.ebitda ?? null), pat: num(y.pat) } }));
  const labels = history.map((y) => y.period);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card accent={GS.indigo}>
        <CardHeader icon={TrendingUp} accent={GS.indigo} title="Revenue, EBITDA & PAT" subtitle="Last 5 financial years · INR crore" />
        <GroupedColumns
          groups={groups}
          series={[
            { key: "revenue", label: "Revenue", color: GS.indigo },
            { key: "ebitda", label: "EBITDA", color: GS.teal },
            { key: "pat", label: "PAT", color: GS.amber },
          ]}
          format={fmtCr}
          yAxisFormat={moneyAxis}
        />
      </Card>
      <Card accent={GS.teal}>
        <CardHeader icon={TrendingUp} accent={GS.teal} title="Margin trend" subtitle="EBITDA & PAT margin · %" />
        <Lines
          labels={labels}
          series={[
            { key: "ebitdam", label: "EBITDA margin", color: GS.teal, values: history.map((y) => num(y.ebitda_margin ?? null)) },
            { key: "patm", label: "PAT margin", color: GS.violet, values: history.map((y) => num(y.pat_margin ?? null)) },
          ]}
          format={fmtPct}
          yAxisFormat={(v) => `${v}%`}
        />
      </Card>
    </div>
  );
}

export function SnapshotScreen({ report }: { report: CompanyReport }) {
  const s = report.snapshot;
  const kpis = s.kpis.slice(0, 5);
  return (
    <Screen>
      <PageHeader icon={Gauge} accent={GS.indigo} title="Snapshot" subtitle={[s.sector, s.industry].filter(Boolean).join(" · ") || report.exchange} />

      <Card accent={GS.indigo}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2.5">
              <StanceTag stance={s.stance} large />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-grey">as of {report.as_of}</span>
            </div>
            {s.stance_rationale && <p className="max-w-3xl text-[13.5px] leading-relaxed text-slate">{s.stance_rationale}</p>}
          </div>
        </div>
        {s.business_model && s.business_model !== "Not available" && (
          <p className="mt-3 border-t border-black/[0.06] pt-3 text-[13px] leading-relaxed text-slate">{s.business_model}</p>
        )}
      </Card>

      {kpis.length > 0 && (
        <StatStrip>
          {kpis.map((m, i) => (
            <MetricStat key={`${m.label}-${i}`} m={m} color={seriesColor(i)} />
          ))}
        </StatStrip>
      )}

      <HistoryCharts report={report} />
    </Screen>
  );
}

export function BusinessScreen({ report }: { report: CompanyReport }) {
  const b = report.business;
  const segs = b.segments.filter((s) => s.pct_revenue?.available && typeof s.pct_revenue.value === "number");
  const donut = segs.map((s, i) => ({ key: s.name, label: s.name, value: s.pct_revenue.value as number, color: seriesColor(i) }));

  const cols: Column<(typeof b.segments)[number]>[] = [
    { key: "name", header: "Segment", render: (r) => <span className="font-semibold text-ink">{r.name}</span> },
    { key: "pct", header: "% revenue", align: "right", sortable: true, sortValue: (r) => num(r.pct_revenue) ?? -1, render: (r) => <CitedValue c={r.pct_revenue} bold /> },
    { key: "trend", header: "Trend", align: "right", render: (r) => <Badge color={trendColor(r.trend)}>{r.trend}</Badge> },
  ];

  return (
    <Screen>
      <PageHeader icon={Layers} accent={GS.violet} title="Business & Segments" subtitle={b.summary ?? "Revenue mix by operating segment"} />
      {segs.length ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,380px)_1fr]">
          <Card accent={GS.violet}>
            <CardHeader icon={Layers} accent={GS.violet} title="Revenue mix" subtitle="Share of revenue" />
            <Donut data={donut} format={(n) => `${n}%`} centerTitle="segments" centerValue={String(segs.length)} />
          </Card>
          <Card accent={GS.violet} pad={false}>
            <div className="p-4 sm:p-5">
              <CardHeader icon={Layers} accent={GS.violet} title="Segment detail" subtitle="Share of revenue · trend · hover for source" />
            </div>
            <div className="px-2 pb-2">
              <Table columns={cols} rows={b.segments} getKey={(r) => r.name} headerColor={GS.violet} initialSort={{ key: "pct", dir: "desc" }} dense />
            </div>
            <div className="px-5 pb-4">
              <SourceFooter report={report} cs={b.segments.map((s) => s.pct_revenue)} />
            </div>
          </Card>
        </div>
      ) : (
        <Card accent={GS.violet}>
          <EmptyState />
        </Card>
      )}
    </Screen>
  );
}

export function GeographiesScreen({ report }: { report: CompanyReport }) {
  const geos = report.business.geographies.filter((g) => g.pct_revenue?.available && typeof g.pct_revenue.value === "number");
  const bars = [...geos]
    .sort((a, b) => (num(b.pct_revenue) ?? 0) - (num(a.pct_revenue) ?? 0))
    .map((g, i) => ({
      key: g.region,
      label: g.region,
      value: g.pct_revenue.value as number,
      color: seriesColor(i),
      valueLabel: `${g.pct_revenue.value}%`,
      note: [g.driver ? `Driver: ${g.driver}` : "", g.risk ? `Risk: ${g.risk}` : ""].filter(Boolean).join(" · ") || undefined,
    }));

  return (
    <Screen>
      <PageHeader icon={Globe2} accent={GS.cyan} title="Geographies" subtitle="Where the revenue — and the risk — is concentrated" />
      {geos.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card accent={GS.cyan}>
            <CardHeader icon={Globe2} accent={GS.cyan} title="Revenue by geography" subtitle="Share of revenue · hover for driver & risk" />
            <HBars data={bars} format={(n) => `${n}%`} maxValue={100} barSize={22} labelWidth={120} />
            <SourceFooter report={report} cs={geos.map((g) => g.pct_revenue)} />
          </Card>
          <Card accent={GS.cyan}>
            <CardHeader icon={Globe2} accent={GS.cyan} title="Drivers & risks" subtitle="Per operating geography" />
            <div className="flex flex-col divide-y divide-black/[0.06]">
              {report.business.geographies.map((g) => (
                <div key={g.region} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink">{g.region}</span>
                    <CitedValue c={g.pct_revenue} bold />
                  </div>
                  {g.driver && <div className="mt-0.5 text-[12px]" style={{ color: GS.good }}>↑ {g.driver}</div>}
                  {g.risk && <div className="text-[12px]" style={{ color: GS.bad }}>↓ {g.risk}</div>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <Card accent={GS.cyan}>
          <EmptyState />
        </Card>
      )}
    </Screen>
  );
}
