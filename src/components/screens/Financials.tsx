"use client";

import { useState } from "react";
import { BarChart3, CalendarClock, History, Scale, Target } from "lucide-react";
import type { Cited, CompanyReport, FinancialYear, Peer, PeriodFinancials } from "@/lib/types/report";
import { GS, seriesColor, withAlpha } from "@/lib/brand";
import { fmtCr, fmtPct, num, axisCr, fmtPrice } from "@/lib/format";
import { Card, CardHeader, PageHeader, MiniStat, Badge } from "../ui/Card";
import { Table, type Column } from "../ui/Table";
import { EmptyState } from "../ui/States";
import { CitedValue } from "../CitedValue";
import { GroupedColumns } from "../charts/GroupedColumns";
import { Lines } from "../charts/Lines";
import { Columns } from "../charts/Columns";
import { Screen, StatStrip, SourceFooter } from "./parts";

const moneyAxis = (v: number) => `₹${axisCr(v)}`;

/* -------------------------------------------------------------- Results */

// Profit & loss — reported every period (quarter and year).
const PNL_ROWS: { key: keyof PeriodFinancials; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "ebitda", label: "EBITDA" },
  { key: "ebitda_margin", label: "EBITDA margin" },
  { key: "ebit_margin", label: "EBIT margin" },
  { key: "pat", label: "Net profit" },
  { key: "pat_margin", label: "Net margin" },
];
// Cash flow & returns — companies report these per YEAR, not per quarter, so we
// always read them from the full-year figure (never blank at the quarter level).
const ANNUAL_ROWS: { key: keyof PeriodFinancials; label: string }[] = [
  { key: "ocf", label: "Operating cash flow" },
  { key: "fcf", label: "Free cash flow" },
  { key: "net_debt", label: "Net cash / debt" },
  { key: "roce", label: "Return on capital (ROCE)" },
  { key: "roe", label: "Return on equity (ROE)" },
];

export function ResultsScreen({ report }: { report: CompanyReport }) {
  const f = report.financials;
  const [period, setPeriod] = useState<"quarter" | "annual">(f?.latest_quarter ? "quarter" : "annual");
  const current = period === "quarter" ? f?.latest_quarter : f?.latest_fy;
  const annual = f?.latest_fy; // cash flow & returns always come from the full year

  const toggle = (
    <div className="flex gap-1 rounded-lg p-1" style={{ background: "#f1f5f9" }}>
      {(["quarter", "annual"] as const).map((p) => {
        const on = period === p;
        const disabled = p === "quarter" ? !f?.latest_quarter : !f?.latest_fy;
        return (
          <button
            key={p}
            onClick={() => !disabled && setPeriod(p)}
            disabled={disabled}
            className="rounded-md px-3 py-1 text-[11.5px] font-bold transition disabled:opacity-40"
            style={{ background: on ? "#fff" : "transparent", color: on ? GS.blue : "#64748b", boxShadow: on ? "0 1px 3px rgba(0,0,0,0.08)" : undefined }}
          >
            {p === "quarter" ? "Quarter" : "Full year"}
          </button>
        );
      })}
    </div>
  );

  const row = (label: string, c?: Cited<number> | null, tag?: string) => {
    if (!c) return null;
    return (
      <tr key={label} className="border-b border-black/[0.06] last:border-0">
        <td className="py-2 text-grey">
          {label}
          {tag && <span className="ml-1.5 rounded px-1 py-0.5 text-[9.5px] font-bold uppercase tracking-wide" style={{ background: `${GS.slate}14`, color: GS.slate }}>{tag}</span>}
        </td>
        <td className="py-2 text-right"><CitedValue c={c} bold /></td>
      </tr>
    );
  };

  return (
    <Screen>
      <PageHeader icon={CalendarClock} accent={GS.blue} title="Results" subtitle={current ? `Latest ${period === "quarter" ? "quarter" : "year"} · ${current.period}` : "Latest reported period"} right={f?.latest_quarter && f?.latest_fy ? toggle : undefined} />
      {current ? (
        <>
          <StatStrip>
            <MiniStat label="Revenue" color={GS.blue} value={<CitedValue c={current.revenue} bold />} />
            <MiniStat label="EBITDA margin" color={GS.teal} value={<CitedValue c={current.ebitda_margin ?? null} bold />} />
            <MiniStat label="Net profit" color={GS.violet} value={<CitedValue c={current.pat} bold />} />
            <MiniStat label="Net margin" color={GS.amber} value={<CitedValue c={current.pat_margin ?? null} bold />} />
            <MiniStat label="Return on equity" color={GS.green} value={<CitedValue c={annual?.roe ?? null} bold />} />
          </StatStrip>
          <Card accent={GS.blue} pad={false}>
            <div className="p-4 sm:p-5">
              <CardHeader icon={BarChart3} accent={GS.blue} title={`${period === "quarter" ? "Quarterly" : "Full-year"} results`} subtitle="Every figure links to its source" />
            </div>
            <div className="px-5 pb-5">
              <table className="w-full border-collapse text-[13px]">
                <tbody>
                  {PNL_ROWS.map((r) => row(r.label, current[r.key] as Cited<number> | undefined))}
                  {/* Cash flow & returns are annual — pulled from the full year so they're never blank on a quarter. */}
                  {ANNUAL_ROWS.map((r) =>
                    row(r.label, annual?.[r.key] as Cited<number> | undefined, period === "quarter" && annual ? annual.period : undefined),
                  )}
                  {current.one_offs && (
                    <tr>
                      <td className="py-2 text-grey">One-offs</td>
                      <td className="py-2 text-right text-slate">{current.one_offs}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <Card accent={GS.blue}><EmptyState /></Card>
      )}
    </Screen>
  );
}

/* -------------------------------------------------------------- History */

// Every row of the trend table; optional rows show only when some year has data.
const TREND_ROWS: { key: keyof FinancialYear; label: string; always?: boolean }[] = [
  { key: "revenue", label: "Revenue", always: true },
  { key: "ebitda", label: "EBITDA", always: true },
  { key: "ebitda_margin", label: "EBITDA margin", always: true },
  { key: "pat", label: "Net profit", always: true },
  { key: "pat_margin", label: "Net margin", always: true },
  { key: "eps", label: "EPS" },
  { key: "ocf", label: "Operating cash flow" },
  { key: "fcf", label: "Free cash flow" },
  { key: "roce", label: "ROCE" },
  { key: "roe", label: "ROE" },
  { key: "net_debt", label: "Net cash / debt" },
];

export function HistoryScreen({ report }: { report: CompanyReport }) {
  const history = report.financials?.history ?? [];
  if (!history.length) {
    return (
      <Screen>
        <PageHeader icon={History} accent={GS.teal} title="Financial Trends" />
        <Card accent={GS.teal}><EmptyState /></Card>
      </Screen>
    );
  }
  const groups = history.map((y) => ({ label: y.period, values: { revenue: num(y.revenue), ebitda: num(y.ebitda ?? null), pat: num(y.pat) } }));
  const labels = history.map((y) => y.period);
  const hasVal = (k: keyof FinancialYear) => history.some((y) => (y[k] as Cited<number> | undefined)?.available);
  const rows = TREND_ROWS.filter((r) => r.always || hasVal(r.key));
  const hasReturns = hasVal("roce") || hasVal("roe");

  // Sticky first column (metric names) so they stay put while years scroll.
  const cellBase = "whitespace-nowrap px-3 py-2.5 text-right tnum";
  const firstCol = "sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2.5 text-left font-semibold text-ink";

  return (
    <Screen>
      <PageHeader icon={History} accent={GS.teal} title="Financial Trends" subtitle={`${history.length}-year trend — every figure traced to its filing`} />
      <div className={`grid gap-4 ${hasReturns ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        <Card accent={GS.teal}>
          <CardHeader icon={BarChart3} accent={GS.teal} title="Revenue, EBITDA & profit" subtitle="INR crore" />
          <GroupedColumns
            groups={groups}
            series={[
              { key: "revenue", label: "Revenue", color: GS.teal },
              { key: "ebitda", label: "EBITDA", color: GS.indigo },
              { key: "pat", label: "Net profit", color: GS.amber },
            ]}
            format={fmtCr}
            yAxisFormat={moneyAxis}
          />
        </Card>
        <Card accent={GS.violet}>
          <CardHeader icon={History} accent={GS.violet} title="Margins" subtitle="EBITDA & net margin · %" />
          <Lines
            labels={labels}
            series={[
              { key: "em", label: "EBITDA margin", color: GS.teal, values: history.map((y) => num(y.ebitda_margin ?? null)) },
              { key: "pm", label: "Net margin", color: GS.violet, values: history.map((y) => num(y.pat_margin ?? null)) },
            ]}
            format={fmtPct}
            yAxisFormat={(v) => `${v}%`}
          />
        </Card>
        {hasReturns && (
          <Card accent={GS.green}>
            <CardHeader icon={Target} accent={GS.green} title="Returns" subtitle="ROCE & ROE · %" />
            <Lines
              labels={labels}
              series={[
                { key: "roce", label: "ROCE", color: GS.green, values: history.map((y) => num(y.roce ?? null)) },
                { key: "roe", label: "ROE", color: GS.teal, values: history.map((y) => num(y.roe ?? null)) },
              ]}
              format={fmtPct}
              yAxisFormat={(v) => `${v}%`}
            />
          </Card>
        )}
      </div>

      <Card accent={GS.teal} pad={false}>
        <div className="p-4 sm:p-5"><CardHeader icon={History} accent={GS.teal} title={`${history.length}-year table`} subtitle="Years across, metrics down — hover any figure for its source" /></div>
        <div className="gs-scroll overflow-x-auto pb-1">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-y border-black/[0.08]" style={{ background: "#f8fafc" }}>
                <th className={`${firstCol} text-[11px] font-bold uppercase tracking-wide text-grey`} style={{ background: "#f8fafc" }}>Metric</th>
                {history.map((y, i) => (
                  <th key={y.period} className={`whitespace-nowrap px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide ${i === history.length - 1 ? "text-ink" : "text-grey"}`}>{y.period}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={r.key} className="border-b border-black/[0.05] last:border-0 hover:bg-black/[0.015]" style={ri % 2 ? { background: "rgba(248,250,252,0.5)" } : undefined}>
                  <td className={firstCol} style={ri % 2 ? { background: "#fbfcfe" } : undefined}>{r.label}</td>
                  {history.map((y, i) => (
                    <td key={y.period} className={`${cellBase} ${i === history.length - 1 ? "font-semibold text-ink" : "text-slate"}`}>
                      <CitedValue c={y[r.key] as Cited<number> | undefined} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Screen>
  );
}

/* ------------------------------------------------------- Peers & Estimates */

type PeerNumKey = "price" | "mcap" | "pe" | "ev_ebitda" | "roe" | "roce" | "roa" | "sales_growth_5y" | "profit_growth_5y" | "de";
const PEER_COLS: { key: PeerNumKey; label: string; heat?: boolean; hue?: string }[] = [
  { key: "price", label: "Price" },
  { key: "mcap", label: "M-cap" },
  { key: "pe", label: "P/E" },
  { key: "ev_ebitda", label: "EV/EBITDA" },
  { key: "roe", label: "ROE", heat: true, hue: GS.green },
  { key: "roce", label: "ROCE", heat: true, hue: GS.teal },
  { key: "roa", label: "ROA", heat: true, hue: GS.cyan },
  { key: "sales_growth_5y", label: "Sales 5Y", heat: true, hue: GS.indigo },
  { key: "profit_growth_5y", label: "Profit 5Y", heat: true, hue: GS.violet },
  { key: "de", label: "D/E" },
];

function TargetRange({ low, mean, high }: { low: number | null; mean: number | null; high: number | null }) {
  if (low === null || high === null || high <= low) return <p className="text-[12px] text-grey">Price target range: Not available</p>;
  const pos = mean !== null ? ((mean - low) / (high - low)) * 100 : 50;
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-grey">Price target range (INR)</div>
      <div className="relative h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${withAlpha(GS.amber, 0.25)}, ${GS.amber})` }}>
        {mean !== null && <span className="absolute -top-1 h-4 w-4 rounded-full border-[3px] bg-white" style={{ left: `calc(${Math.max(0, Math.min(100, pos))}% - 8px)`, borderColor: GS.amber }} />}
      </div>
      <div className="tnum mt-1.5 flex justify-between text-[11.5px]">
        <span className="text-grey">{fmtPrice(low)}</span>
        {mean !== null && <span className="font-bold" style={{ color: GS.amber }}>{fmtPrice(mean)}</span>}
        <span className="text-grey">{fmtPrice(high)}</span>
      </div>
    </div>
  );
}

export function PeersScreen({ report }: { report: CompanyReport }) {
  const peers = report.peers.peers;
  const e = report.estimates;

  const stats: Record<string, { min: number; max: number }> = {};
  for (const col of PEER_COLS) {
    const vals = peers.map((p) => num(p[col.key] as Cited<number> | undefined)).filter((v): v is number => v !== null);
    if (vals.length) stats[col.key] = { min: Math.min(...vals), max: Math.max(...vals) };
  }

  const cols: Column<Peer>[] = [
    {
      key: "name",
      header: "Company",
      sortable: true,
      sortValue: (p) => p.name,
      render: (p) => (
        <span className="flex items-center gap-1.5">
          {p.is_self && <span className="h-2 w-2 rounded-full" style={{ background: GS.amber }} />}
          <span className={p.is_self ? "font-extrabold text-ink" : "font-semibold text-slate"}>{p.name}</span>
          {p.ticker && <span className="text-[10.5px] text-grey">{p.ticker}</span>}
        </span>
      ),
    },
    ...PEER_COLS.map<Column<Peer>>((col) => ({
      key: col.key,
      header: col.label,
      align: "right" as const,
      sortable: true,
      sortValue: (p) => num(p[col.key] as Cited<number> | undefined) ?? -1,
      render: (p) => <CitedValue c={p[col.key] as Cited<number> | undefined} />,
      heat: col.heat
        ? (p) => {
            const v = num(p[col.key] as Cited<number> | undefined);
            const st = stats[col.key];
            if (v === null || !st || st.max <= st.min) return null;
            return (v - st.min) / (st.max - st.min);
          }
        : undefined,
      heatScale: "hue" as const,
      heatColor: col.hue,
    })),
  ];

  const hasFwdRev = !!e?.available && e.forward.some((f) => f.revenue?.available);
  const hasFwdEps = !!e?.available && e.forward.some((f) => f.eps?.available);

  return (
    <Screen>
      <PageHeader icon={Scale} accent={GS.amber} title="Peers & Estimates" subtitle={report.peers.note ?? "How the company stacks up — and where the Street sees it going"} />

      {peers.length ? (
        <Card accent={GS.amber} pad={false}>
          <div className="p-4 sm:p-5"><CardHeader icon={Scale} accent={GS.amber} title="Peer comparison" subtitle="Quality & growth columns shaded by rank · hover for source" /></div>
          <div className="px-2 pb-2">
            <Table columns={cols} rows={peers} getKey={(p) => p.name} headerColor={GS.amber} activeKey={peers.find((p) => p.is_self)?.name ?? null} dense />
          </div>
          <div className="px-5 pb-4">
            <SourceFooter report={report} cs={peers.flatMap((p) => PEER_COLS.map((c) => p[c.key] as Cited<number> | undefined))} />
          </div>
        </Card>
      ) : (
        <Card accent={GS.amber}><EmptyState title="Peer comparison" /></Card>
      )}

      {e?.available && (
        <>
          <PageHeader icon={Target} accent={GS.amber} title="Street estimates" subtitle={e.summary} />
          <div className="grid gap-4 lg:grid-cols-3">
            <Card accent={GS.amber}>
              <CardHeader icon={BarChart3} accent={GS.amber} title="Forward revenue" subtitle="Consensus · INR crore" />
              {hasFwdRev ? (
                <Columns data={e.forward.filter((f) => f.revenue?.available).map((f, i) => ({ key: f.period, label: f.period, value: num(f.revenue ?? null) ?? 0, color: seriesColor(i) }))} format={fmtCr} yAxisFormat={moneyAxis} height={210} />
              ) : (
                <EmptyState />
              )}
            </Card>
            <Card accent={GS.green}>
              <CardHeader icon={Target} accent={GS.green} title="Forward EPS" subtitle="Consensus · INR" />
              {hasFwdEps ? (
                <Lines labels={e.forward.map((f) => f.period)} series={[{ key: "eps", label: "EPS (est.)", color: GS.green, values: e.forward.map((f) => num(f.eps ?? null)) }]} format={(n) => `₹${n}`} yAxisFormat={(v) => `₹${v}`} height={210} />
              ) : (
                <EmptyState />
              )}
            </Card>
            <Card accent={GS.amber}>
              <CardHeader icon={Scale} accent={GS.amber} title="Consensus" subtitle={e.eps_revision ? `EPS revisions: ${e.eps_revision}` : undefined} />
              <div className="flex flex-col gap-3">
                <TargetRange low={num(e.target_low ?? null)} mean={num(e.target_mean ?? null)} high={num(e.target_high ?? null)} />
                <div className="grid grid-cols-2 gap-2 text-[13px]">
                  <div><div className="text-[11px] text-grey">Rating</div><CitedValue c={e.rating ?? null} bold /></div>
                  <div><div className="text-[11px] text-grey">Analysts</div><CitedValue c={e.analysts ?? null} bold /></div>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </Screen>
  );
}
