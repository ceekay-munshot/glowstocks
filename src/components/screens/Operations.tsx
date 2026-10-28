"use client";

import { Users, Factory, Rocket, Mic, Quote, Sparkles, TriangleAlert } from "lucide-react";
import type { Cited, CompanyReport } from "@/lib/types/report";
import { GS, seriesColor, trendColor } from "@/lib/brand";
import { fmtCr, num, formatValue, NA } from "@/lib/format";
import { Card, CardHeader, PageHeader, Badge, MiniStat } from "../ui/Card";
import { EmptyState, NotApplicable } from "../ui/States";
import { CitedValue, CiteWrap } from "../CitedValue";
import { Donut } from "../charts/Donut";
import { HBars } from "../charts/HBars";
import { Screen, SourceFooter } from "./parts";

export function CustomersScreen({ report }: { report: CompanyReport }) {
  const c = report.customers;
  const na = !c || (!c.applicable && c.groups.length === 0 && c.order_book.length === 0);
  const mix = (c?.groups ?? []).filter((g) => g.concentration?.available && typeof g.concentration.value === "number");
  const donut = mix.map((g, i) => ({ key: g.segment, label: g.segment, value: g.concentration.value as number, color: seriesColor(i) }));
  const orderBars = (c?.order_book ?? [])
    .map((o, i) => ({ key: o.metric, label: o.metric, value: num(o.value), i }))
    .filter((r): r is { key: string; label: string; value: number; i: number } => r.value !== null)
    .map((r) => ({ key: r.key, label: r.label, value: r.value, color: seriesColor(r.i), valueLabel: fmtCr(r.value) }));

  return (
    <Screen>
      <PageHeader icon={Users} accent={GS.teal} title="Customers & Order Book" subtitle={c?.summary ?? "Client concentration and the deal pipeline"} />
      {na ? (
        <Card accent={GS.teal}>{c?.applicable === false ? <NotApplicable reason={c?.not_applicable_reason} /> : <EmptyState />}</Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card accent={GS.teal}>
              <CardHeader icon={Users} accent={GS.teal} title="Customer mix" subtitle="Revenue by client bucket" />
              {donut.length ? <Donut data={donut} format={(n) => `${n}%`} /> : <EmptyState />}
            </Card>
            <Card accent={GS.teal}>
              <CardHeader icon={Users} accent={GS.teal} title="Order book / TCV" subtitle="Deal pipeline · INR crore" />
              {orderBars.length ? <HBars data={orderBars} format={fmtCr} barSize={24} labelWidth={150} /> : <EmptyState />}
            </Card>
          </div>
          {(c?.groups.length ?? 0) > 0 && (
            <Card accent={GS.teal} pad={false}>
              <div className="p-4 sm:p-5"><CardHeader icon={Users} accent={GS.teal} title="Client concentration" subtitle="Share of revenue · dependency risk" /></div>
              <div className="px-5 pb-5">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-black/[0.06]">
                      <th className="py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-grey">Client group</th>
                      <th className="py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-grey">% revenue</th>
                      <th className="py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-grey">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c!.groups.map((g) => (
                      <tr key={g.segment} className="border-b border-black/[0.06] last:border-0">
                        <td className="py-2"><div className="font-semibold text-ink">{g.segment}</div>{g.names && <div className="text-[11px] text-grey">{g.names}</div>}</td>
                        <td className="py-2 text-right"><CitedValue c={g.concentration} bold /></td>
                        <td className="py-2 text-[12px] text-grey">{g.risk ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <SourceFooter report={report} cs={c!.groups.map((g) => g.concentration)} />
              </div>
            </Card>
          )}
        </div>
      )}
    </Screen>
  );
}

export function CapacityScreen({ report }: { report: CompanyReport }) {
  const cap = report.capacity;
  const na = !cap || (!cap.applicable && cap.sites.length === 0 && cap.metrics.length === 0);
  const capRows = (cap?.sites ?? []).map((s, i) => ({ s, i, v: num(s.capacity ?? null) })).filter((r) => r.v !== null);
  const utilRows = (cap?.sites ?? []).map((s, i) => ({ s, i, v: num(s.utilization ?? null) })).filter((r) => r.v !== null);
  const useCap = capRows.length > 0;
  const bars = (useCap ? capRows : utilRows).map((r) => ({
    key: r.s.site,
    label: r.s.site,
    value: r.v as number,
    color: seriesColor(r.i),
    valueLabel: useCap ? String(Math.round(r.v as number)) : `${r.v}%`,
  }));

  return (
    <Screen>
      <PageHeader icon={Factory} accent={GS.sky} title="Capacity & Footprint" subtitle={cap?.summary ?? (cap?.kind === "delivery" ? "Delivery footprint" : "Operating footprint")} />
      {na ? (
        <Card accent={GS.sky}>{cap?.applicable === false ? <NotApplicable reason={cap?.not_applicable_reason} /> : <EmptyState />}</Card>
      ) : (
        <div className="space-y-4">
          {(cap?.metrics.length ?? 0) > 0 && (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {cap!.metrics.slice(0, 5).map((m, i) => {
                const ok = m.available && m.value !== null && m.value !== undefined;
                return <MiniStat key={`${m.label}-${i}`} label={m.label} color={seriesColor(i)} value={ok ? <CiteWrap c={m}>{formatValue(m.value, m.unit)}</CiteWrap> : <span className="text-[14px] italic text-grey">{NA}</span>} />;
              })}
            </div>
          )}
          {bars.length > 0 && (
            <Card accent={GS.sky}>
              <CardHeader icon={Factory} accent={GS.sky} title={useCap ? "Capacity by site" : "Utilization by site"} subtitle={useCap ? "Installed capacity" : "Delivery utilization · %"} />
              <HBars data={bars} format={(n) => String(Math.round(n))} barSize={22} labelWidth={150} />
            </Card>
          )}
          {(cap?.sites.length ?? 0) > 0 && (
            <Card accent={GS.sky} pad={false}>
              <div className="p-4 sm:p-5"><CardHeader icon={Factory} accent={GS.sky} title="Sites & expansion" subtitle={`${cap?.kind === "delivery" ? "Delivery centres" : "Plants / sites"} · hover figures for source`} /></div>
              <div className="gs-scroll overflow-x-auto px-5 pb-5">
                <table className="w-full border-collapse text-[12.5px]">
                  <thead>
                    <tr className="border-b border-black/[0.06]">
                      {["Site", "Product", "Capacity", "Utilization", "Capex", "Expansion", "Timeline"].map((h, i) => (
                        <th key={h} className={`py-2 ${i >= 2 && i <= 4 ? "text-right" : "text-left"} text-[11px] font-semibold uppercase tracking-wide text-grey`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cap!.sites.map((s) => (
                      <tr key={s.site} className="border-b border-black/[0.06] last:border-0">
                        <td className="py-2 font-semibold text-ink">{s.site}</td>
                        <td className="py-2 text-grey">{s.product ?? "—"}</td>
                        <td className="py-2 text-right"><CitedValue c={s.capacity ?? null} /></td>
                        <td className="py-2 text-right"><CitedValue c={s.utilization ?? null} /></td>
                        <td className="py-2 text-right"><CitedValue c={s.capex ?? null} /></td>
                        <td className="py-2 text-[12px] text-grey">{s.expansion ?? "—"}</td>
                        <td className="py-2 text-[12px] text-grey">{s.timeline ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </Screen>
  );
}

const DIR_LABEL: Record<string, string> = { tailwind: "Tailwind", headwind: "Headwind", neutral: "Neutral", "Not available": "—" };

export function GrowthScreen({ report }: { report: CompanyReport }) {
  const g = report.growth;
  return (
    <Screen>
      <PageHeader icon={Rocket} accent={GS.green} title="Growth & Catalysts" subtitle={g?.summary ?? "The numbers and guidance behind the growth"} />
      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(280px,360px)]">
        <Card accent={GS.green}>
          <CardHeader icon={Rocket} accent={GS.green} title="Growth drivers" subtitle="Direction · evidence" />
          {g && g.drivers.length ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {g.drivers.map((d, i) => (
                <div key={`${d.name}-${i}`} className="rounded-xl border border-black/[0.06] bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-bold text-ink">{d.name}</span>
                    <Badge color={trendColor(d.direction)}>{DIR_LABEL[d.direction] ?? d.direction}</Badge>
                  </div>
                  <p className="mt-1 text-[12px] leading-snug text-slate">{d.detail}</p>
                  {d.metric?.available && <div className="mt-1 text-[12px] font-semibold"><CitedValue c={d.metric} /></div>}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </Card>
        <Card accent={GS.amber}>
          <CardHeader icon={Sparkles} accent={GS.amber} title="Catalyst watchlist" subtitle="What confirms vs falsifies" />
          {g && g.catalysts.length ? (
            <div className="flex flex-col gap-3">
              {g.catalysts.map((cat, i) => (
                <div key={i} className="flex gap-2.5">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: GS.amber }} />
                  <div className="min-w-0 text-[12.5px] leading-snug">
                    <div className="font-bold text-ink">{cat.catalyst}</div>
                    <div className="text-grey">{cat.timing} · KPI: {cat.kpi}</div>
                    {cat.confirms && <div style={{ color: GS.good }}>✓ {cat.confirms}</div>}
                    {cat.falsifies && <div style={{ color: GS.bad }}>✗ {cat.falsifies}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </Card>
      </div>
      {g && g.downside_triggers.length > 0 && (
        <Card accent={GS.rose}>
          <CardHeader icon={TriangleAlert} accent={GS.rose} title="Downside triggers" subtitle="Bear-case watch items" />
          <div className="flex flex-wrap gap-2">
            {g.downside_triggers.map((t, i) => (
              <span key={i} className="rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ background: `${GS.rose}14`, color: GS.rose, border: `1px solid ${GS.rose}33` }}>▼ {t}</span>
            ))}
          </div>
        </Card>
      )}
    </Screen>
  );
}

export function ConcallScreen({ report }: { report: CompanyReport }) {
  const cc = report.concall;
  const na = !cc || !cc.available;
  return (
    <Screen>
      <PageHeader icon={Mic} accent={GS.violet} title="Earnings Call" subtitle={cc?.available ? [cc.period, cc.tone].filter(Boolean).join(" · ") : "Latest management commentary"} />
      {na ? (
        <Card accent={GS.violet}><EmptyState title="Not available" hint={cc?.tone ?? "No recent earnings-call transcript was found."} /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_minmax(280px,360px)]">
          <Card accent={GS.violet}>
            <CardHeader icon={Quote} accent={GS.violet} title={`Highlights${cc!.period ? ` — ${cc!.period}` : ""}`} subtitle={cc!.tone} />
            {cc!.highlights.length ? (
              <div className="flex flex-col gap-3">
                {cc!.highlights.map((h, i) => (
                  <div key={i} className="rounded-r-xl border-l-[3px] bg-slate-50/60 px-3 py-2" style={{ borderColor: GS.violet, background: `${GS.violet}08` }}>
                    <div className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: GS.violet }}>{h.theme}</div>
                    <CiteWrap c={{ value: null, available: true, source: h.source, url: h.url ?? null, date: h.date }}>
                      <p className="my-0.5 text-[13px] italic leading-relaxed text-slate">“{h.quote}”</p>
                    </CiteWrap>
                    <div className="text-[11px] text-grey">— {h.speaker}{h.date ? ` · ${h.date}` : ""}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </Card>
          <Card accent={GS.green}>
            <CardHeader icon={Sparkles} accent={GS.green} title="So what — key insights" subtitle="Reading between the lines" />
            {cc!.insights.length ? (
              <ul className="flex list-disc flex-col gap-2 pl-4 text-[13px] leading-snug text-slate">
                {cc!.insights.map((ins, i) => <li key={i}>{ins}</li>)}
              </ul>
            ) : (
              <EmptyState />
            )}
          </Card>
        </div>
      )}
    </Screen>
  );
}
