"use client";

import { Scale, ShieldAlert, Handshake, FileText, ShieldCheck, TrendingUp, TrendingDown, Target, ExternalLink } from "lucide-react";
import type { Cited, CompanyReport, Scenario, SourceType } from "@/lib/types/report";
import { GS, seriesColor, levelColor, integrityColor } from "@/lib/brand";
import { num, cleanSource } from "@/lib/format";
import { Card, CardHeader, PageHeader, Badge, Pill } from "../ui/Card";
import { EmptyState } from "../ui/States";
import { CitedValue, CiteWrap } from "../CitedValue";
import { Columns } from "../charts/Columns";
import { Screen, StanceTag } from "./parts";

const SCEN_COLOR: Record<string, string> = { Bear: GS.rose, Base: GS.blue, Bull: GS.green };

export function StanceScreen({ report }: { report: CompanyReport }) {
  const t = report.thesis;
  const scenarios = t.scenarios ?? [];
  const upside = scenarios.map((s) => ({ key: s.name, label: s.name, value: num(s.upside), s })).filter((r) => r.value !== null);

  return (
    <Screen>
      <PageHeader icon={Scale} accent={GS.indigo} title="Stance & Scenarios" subtitle="The call, what supports it, and what would change it" />

      <Card accent={GS.indigo}>
        <div className="mb-2 flex items-center gap-2.5">
          <StanceTag stance={t.stance} large />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-grey">consistent with the Snapshot view</span>
        </div>
        {t.change_my_mind.length > 0 && (
          <div className="mt-2 border-t border-black/[0.06] pt-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-ink"><Target size={14} style={{ color: GS.indigo }} /> What would change the view</div>
            <ul className="list-disc space-y-1 pl-5 text-[13px] leading-snug text-slate">
              {t.change_my_mind.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card accent={GS.green}>
          <CardHeader icon={TrendingUp} accent={GS.green} title="Bull case — supports" />
          {t.supports.length ? (
            <ul className="flex flex-col gap-2.5">
              {t.supports.map((p, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-snug">
                  <span className="font-bold" style={{ color: GS.good }}>+</span>
                  <CiteWrap c={{ value: null, available: true, source: p.source, url: p.url ?? null }}><span className="text-slate">{p.text}</span></CiteWrap>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState />
          )}
        </Card>
        <Card accent={GS.rose}>
          <CardHeader icon={TrendingDown} accent={GS.rose} title="Bear case — counters" />
          {t.counters.length ? (
            <ul className="flex flex-col gap-2.5">
              {t.counters.map((p, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-snug">
                  <span className="font-bold" style={{ color: GS.bad }}>−</span>
                  <CiteWrap c={{ value: null, available: true, source: p.source, url: p.url ?? null }}><span className="text-slate">{p.text}</span></CiteWrap>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState />
          )}
        </Card>
      </div>

      {scenarios.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,380px)_1fr]">
          <Card accent={GS.indigo}>
            <CardHeader icon={Target} accent={GS.indigo} title="Scenario upside" subtitle="Implied upside / downside to target" />
            {upside.length ? (
              <Columns
                data={upside.map((r) => ({ key: r.key, label: r.label, value: r.value as number, color: SCEN_COLOR[r.s.name] ?? ((r.value as number) >= 0 ? GS.green : GS.rose), valueLabel: `${(r.value as number) > 0 ? "+" : ""}${r.value}%` }))}
                format={(n) => `${n > 0 ? "+" : ""}${n}%`}
                yAxisFormat={(v) => `${v}%`}
                height={220}
                showValues
              />
            ) : (
              <EmptyState />
            )}
          </Card>
          <Card accent={GS.indigo}>
            <CardHeader icon={Scale} accent={GS.indigo} title="Scenarios" subtitle="Bear · Base · Bull — analyst estimates" />
            <div className="grid gap-3 sm:grid-cols-3">
              {scenarios.map((s) => <ScenarioCard key={s.name} s={s} />)}
            </div>
          </Card>
        </div>
      )}
    </Screen>
  );
}

function ScenarioCard({ s }: { s: Scenario }) {
  const color = SCEN_COLOR[s.name] ?? GS.grey;
  const rows: { label: string; c?: Cited<number> | null }[] = [
    { label: "Probability", c: s.probability },
    { label: "Rev CAGR", c: s.revenue_cagr },
    { label: "Margin", c: s.margin },
    { label: "Exit P/E", c: s.pe_exit },
    { label: "Target", c: s.target_price },
    { label: "Upside", c: s.upside },
  ];
  return (
    <div className="rounded-xl border bg-white p-3" style={{ borderColor: `${color}44`, borderTopWidth: 3, borderTopColor: color }}>
      <div className="text-[13.5px] font-bold" style={{ color }}>{s.name}</div>
      <div className="mt-1.5 flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-2 text-[12px]">
            <span className="text-grey">{r.label}</span>
            <CitedValue c={r.c ?? null} bold />
          </div>
        ))}
      </div>
      {s.narrative && <p className="mt-1.5 text-[11px] leading-snug text-grey">{s.narrative}</p>}
    </div>
  );
}

export function RisksScreen({ report }: { report: CompanyReport }) {
  const r = report.risks;
  const na = !r || (r.register.length === 0 && r.downside_scenarios.length === 0);
  return (
    <Screen>
      <PageHeader icon={ShieldAlert} accent={GS.rose} title="Risks" subtitle={r?.summary ?? "Severity × probability, company-specific"} />
      {na ? (
        <Card accent={GS.rose}><EmptyState /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_minmax(280px,360px)]">
          <Card accent={GS.rose}>
            <CardHeader icon={ShieldAlert} accent={GS.rose} title="Risk register" subtitle="What could hurt the thesis" />
            <div className="flex flex-col gap-2.5">
              {r!.register.map((row, i) => (
                <div key={i} className="rounded-xl border border-black/[0.06] bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="text-[13px] font-bold text-ink">{row.risk}</span>
                    <span className="flex gap-1.5">
                      <Badge color={levelColor(row.severity)}>Sev: {row.severity}</Badge>
                      <Badge color={levelColor(row.probability)}>Prob: {row.probability}</Badge>
                    </span>
                  </div>
                  {row.evidence && <p className="mt-1 text-[12px] text-slate">{row.evidence}</p>}
                  {row.transmission && <p className="mt-0.5 text-[11.5px] text-grey">→ {row.transmission}</p>}
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px]">
                    {row.leading_indicators && <span className="text-grey">Watch: {row.leading_indicators}</span>}
                    {row.mitigants && <span style={{ color: GS.good }}>Mitigant: {row.mitigants}</span>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card accent={GS.rose}>
            <CardHeader icon={TrendingDown} accent={GS.rose} title="Top downside scenarios" subtitle="Trigger · impact · probability" />
            <div className="flex flex-col gap-2.5">
              {r!.downside_scenarios.map((d, i) => (
                <div key={i} className="rounded-xl border bg-white p-3" style={{ borderColor: `${GS.rose}33`, borderLeftWidth: 3, borderLeftColor: GS.rose }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold" style={{ color: GS.rose }}>{d.name}</span>
                    <CitedValue c={d.probability ?? null} bold />
                  </div>
                  <p className="mt-1 text-[12px] text-slate">Trigger: {d.trigger}</p>
                  {d.impact && <p className="mt-0.5 text-[12px] text-grey">Impact: {d.impact}</p>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </Screen>
  );
}

export function MnaScreen({ report }: { report: CompanyReport }) {
  const m = report.mna;
  const none = !m || !m.found || m.deals.length === 0;
  return (
    <Screen>
      <PageHeader icon={Handshake} accent={GS.teal} title="M&A & Inorganic" subtitle={m?.summary ?? "Acquisitions, divestments and partnerships"} />
      <Card accent={GS.teal}>
        {none ? (
          <EmptyState title={m && !m.found ? "No material M&A found" : "Not available"} hint={m?.summary} />
        ) : (
          <div className="flex flex-col">
            {m!.deals.map((d, i) => (
              <div key={i} className="flex gap-3 pb-4 last:pb-0">
                <div className="flex flex-col items-center">
                  <span className="tnum text-[11px] font-bold" style={{ color: GS.teal }}>{d.date ?? "—"}</span>
                  <span className="mt-1 h-2.5 w-2.5 rounded-full" style={{ background: GS.teal }} />
                  {i < m!.deals.length - 1 && <span className="mt-1 w-0.5 flex-1" style={{ background: "#e2e8f0" }} />}
                </div>
                <div className="min-w-0 flex-1 pb-2 text-[13px] leading-snug">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-ink">{d.target}</span>
                    {d.status && <Pill color={GS.teal}>{d.status}</Pill>}
                  </div>
                  <p className="text-slate">{d.what}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 text-[12px] text-grey">
                    <span>Deal size: <CitedValue c={d.deal_size ?? null} /></span>
                    {d.payment && <span>Payment: {d.payment}</span>}
                  </div>
                  {d.rationale && <p className="mt-0.5 text-[11.5px] text-grey">Rationale: {d.rationale}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Screen>
  );
}

const TYPE_STYLE: Record<SourceType, { label: string; color: string }> = {
  annual_report: { label: "Annual report", color: GS.blue },
  concall: { label: "Concall", color: GS.teal },
  investor_presentation: { label: "Investor PPT", color: GS.violet },
  exchange_filing: { label: "Exchange filing", color: GS.amber },
  screener: { label: "Market data", color: GS.green },
  web: { label: "Web", color: GS.grey },
  news: { label: "News", color: GS.rose },
  estimate: { label: "Estimate", color: GS.indigo },
  other: { label: "Other", color: GS.grey },
};
const INTEGRITY_LABEL: Record<string, string> = { pass: "Pass", warn: "Warn", fail: "Fail", "Not available": "N/A" };

export function SourcesScreen({ report }: { report: CompanyReport }) {
  const sources = report.sources;
  const it = report.integrity;
  return (
    <Screen>
      <PageHeader icon={FileText} accent={GS.slate} title="Sources & Integrity" subtitle={`${sources.length} source${sources.length === 1 ? "" : "s"} · the provenance behind every figure`} />

      <Card accent={GS.slate} pad={false}>
        <div className="p-4 sm:p-5"><CardHeader icon={FileText} accent={GS.slate} title="Sources" subtitle={report.last_updated ? `Updated ${report.last_updated.slice(0, 10)}` : undefined} /></div>
        <div className="gs-scroll overflow-x-auto px-5 pb-5">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {["#", "Title", "Type", "Date", "Locator", "Link"].map((h) => (
                  <th key={h} className="py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-grey">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => {
                const ts = TYPE_STYLE[s.type] ?? TYPE_STYLE.other;
                return (
                  <tr key={s.id} className="border-b border-black/[0.06] last:border-0 align-top">
                    <td className="py-2 pr-3 text-grey">{s.id}</td>
                    <td className="py-2 pr-3 font-semibold text-ink">{cleanSource(s.title)}</td>
                    <td className="py-2 pr-3"><Badge color={ts.color}>{ts.label}</Badge></td>
                    <td className="py-2 pr-3 text-grey">{s.date ?? "—"}</td>
                    <td className="py-2 pr-3 text-grey">{s.locator ?? "—"}</td>
                    <td className="py-2">
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold" style={{ color: GS.indigo }}>
                          Open <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-grey">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card accent={GS.green}>
        <CardHeader icon={ShieldCheck} accent={GS.green} title="Data integrity" subtitle={cleanSource(it?.coverage_note) || "Data-trust checklist"} />
        {it && it.checks.length ? (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {it.checks.map((c, i) => {
              const col = integrityColor(c.status);
              return (
                <div key={i} className="flex items-start gap-2.5 rounded-xl border border-black/[0.06] bg-white p-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[13px] font-bold" style={{ background: `${col}18`, color: col }}>
                    {c.status === "pass" ? "✓" : c.status === "warn" ? "!" : c.status === "fail" ? "✗" : "○"}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12.5px] font-semibold text-ink">{c.check}</span>
                      <span className="text-[10px] font-bold" style={{ color: col }}>{INTEGRITY_LABEL[c.status] ?? c.status}</span>
                    </div>
                    {c.detail && <p className="mt-0.5 text-[11.5px] text-grey">{cleanSource(c.detail)}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState />
        )}
      </Card>
    </Screen>
  );
}
