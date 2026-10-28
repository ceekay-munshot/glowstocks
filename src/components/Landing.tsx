"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Globe2, BarChart3, Link2, Download, CalendarDays, Check, RefreshCw, ChevronRight, TrendingUp } from "lucide-react";
import type { CompanyRow } from "@/lib/bundledReports";
import { getRecentRuns } from "@/lib/recentRuns";
import { GS, logoGradient, timeAgo, rampGYR } from "@/lib/brand";
import { CompanySearch } from "./CompanySearch";

type SortKey = "company" | "updated" | "coverage";

export function Landing({ companies }: { companies: CompanyRow[] }) {
  const router = useRouter();
  const [sort, setSort] = useState<SortKey>("updated");
  const [asc, setAsc] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [recent, setRecent] = useState<CompanyRow[]>([]);
  // Read this browser's own recent runs AFTER mount, so SSR and the first client
  // render match (both show just the bundled list); the merge happens client-side.
  useEffect(() => {
    setMounted(true);
    setRecent(getRecentRuns());
  }, []);

  const go = (ticker: string) => router.push(`/company/${encodeURIComponent(ticker)}`);
  const update = (ticker: string) => router.push(`/company/${encodeURIComponent(ticker)}?run=1`);

  // Bundled (offline) companies + anything this browser has researched, deduped
  // by ticker (the viewed copy wins, but the sample keeps its badge).
  const all = useMemo(() => {
    const byTicker = new Map<string, CompanyRow>();
    for (const c of companies) byTicker.set(c.ticker, c);
    for (const r of recent) {
      const prev = byTicker.get(r.ticker);
      byTicker.set(r.ticker, prev ? { ...r, is_sample: r.is_sample || prev.is_sample } : r);
    }
    return [...byTicker.values()];
  }, [companies, recent]);

  const rows = useMemo(() => {
    const dir = asc ? 1 : -1;
    return [...all].sort((a, b) => {
      if (sort === "company") return dir * a.company.localeCompare(b.company);
      if (sort === "coverage") return dir * (a.coverageDone / a.coverageTotal - b.coverageDone / b.coverageTotal);
      return dir * (new Date(a.last_updated).getTime() - new Date(b.last_updated).getTime());
    });
  }, [all, sort, asc]);

  const setSortKey = (k: SortKey) => {
    if (k === sort) setAsc((v) => !v);
    else {
      setSort(k);
      setAsc(k === "company");
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="gs-header sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between border-b border-black/[0.06] bg-white/85 px-5 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${GS.indigo}, ${GS.violet})` }}>
            <TrendingUp size={16} strokeWidth={2.5} />
          </span>
          <h1 className="text-[15px] font-extrabold tracking-tight text-ink">
            glow<span style={{ color: GS.indigo }}>stocks</span>
          </h1>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-grey">
          <Globe2 size={14} /> India · NSE / BSE
        </span>
      </header>

      <main className="gs-scroll flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-[1640px] px-4 pb-12 sm:px-6">
          {/* hero */}
          <section className="mx-auto max-w-[760px] px-1 pb-5 pt-14 text-center">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold" style={{ background: `${GS.indigo}12`, color: GS.indigo }}>
              <Sparkles size={14} /> Source-backed equity research
            </span>
            <h2 className="mb-3 text-[clamp(30px,5vw,46px)] font-black leading-[1.08] tracking-tight text-ink">
              Research any Indian company,{" "}
              <span style={{ background: `linear-gradient(100deg, ${GS.indigo}, ${GS.violet} 45%, ${GS.teal})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>beautifully.</span>
            </h2>
            <p className="mx-auto mb-7 max-w-[560px] text-[16px] leading-relaxed text-grey">
              Search a listed company and get a vivid, chart-led report — financials, peers, growth, risks and more, with every figure traced to its source.
            </p>
            <div className="mx-auto max-w-[620px]">
              <CompanySearch size="lg" autoFocus onSelect={(t) => go(t)} />
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              <FeatureChip icon={<BarChart3 size={13} />} color={GS.amber}>13 research sections</FeatureChip>
              <FeatureChip icon={<Link2 size={13} />} color={GS.indigo}>Every number sourced</FeatureChip>
              <FeatureChip icon={<Download size={13} />} color={GS.green}>PDF &amp; Excel exports</FeatureChip>
            </div>
          </section>

          {/* previous runs */}
          <section className="animate-fade-up mt-5">
            <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-card">
              <span className="block h-[3px]" style={{ background: `linear-gradient(90deg, ${GS.indigo}, ${GS.indigo}00)` }} />
              <div className="flex items-center gap-2.5 px-4 py-3.5 sm:px-5">
                <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${GS.indigo}14`, color: GS.indigo }}>
                  <BarChart3 size={17} strokeWidth={2.2} />
                </span>
                <div>
                  <h3 className="text-[14.5px] font-bold text-ink">Previous runs</h3>
                  <p className="text-[11.5px] text-grey">{rows.length} researched {rows.length === 1 ? "company" : "companies"} · open or refresh any</p>
                </div>
              </div>
              <div className="gs-scroll overflow-x-auto">
                <table className="w-full border-collapse text-[13.5px]">
                  <thead>
                    <tr className="border-y border-black/[0.06] bg-slate-50/60" style={{ background: "#f8fafc" }}>
                      <Th label="Company" onClick={() => setSortKey("company")} active={sort === "company"} asc={asc} />
                      <Th label="Last run" onClick={() => setSortKey("updated")} active={sort === "updated"} asc={asc} />
                      <Th label="Coverage" onClick={() => setSortKey("coverage")} active={sort === "coverage"} asc={asc} />
                      <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-grey">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const g = logoGradient(r.ticker);
                      const cov = rampGYR(1 - r.coverageDone / r.coverageTotal);
                      return (
                        <tr key={r.ticker} onClick={() => go(r.ticker)} className="cursor-pointer border-b border-black/[0.06] transition last:border-0 hover:bg-black/[0.015]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-[12.5px] font-extrabold text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}>
                                {r.ticker.replace(/[^A-Z0-9]/gi, "").slice(0, 3).toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-ink">{r.company}</span>
                                  <span className="tnum rounded-md px-1.5 py-0.5 text-[11px] font-bold" style={{ background: `${GS.indigo}12`, color: GS.indigo }}>{r.ticker}</span>
                                  {r.is_sample && <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: `${GS.amber}16`, color: GS.amber }}>sample</span>}
                                </div>
                                <div className="mt-0.5 max-w-[320px] truncate text-[11.5px] text-grey">{[r.sector, r.industry].filter(Boolean).join(" · ") || r.exchange}</div>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3" title={new Date(r.last_updated).toLocaleString()}>
                            <span className="inline-flex items-center gap-1.5 text-slate">
                              <CalendarDays size={14} className="text-faint" />
                              {mounted ? timeAgo(r.last_updated) : r.last_updated.slice(0, 10)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-bold" style={{ background: `${cov}16`, color: cov, border: `1px solid ${cov}33` }}>
                              <Check size={13} /> {r.coverageDone}/{r.coverageTotal}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex gap-2">
                              <button onClick={() => update(r.ticker)} title="Refresh this research" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 text-[12.5px] font-bold text-slate">
                                <RefreshCw size={14} /> Update
                              </button>
                              <button onClick={() => go(r.ticker)} className="inline-flex h-8 items-center gap-1 rounded-lg px-3 text-[12.5px] font-bold text-white" style={{ background: GS.indigo }}>
                                View <ChevronRight size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="shrink-0 border-t border-black/[0.06] bg-white/70 px-5 py-2.5">
        <div className="mx-auto flex w-full max-w-[1640px] flex-wrap justify-between gap-2 text-[11px] text-grey">
          <span>glowstocks · source-backed equity research · India (NSE / BSE)</span>
          <span>Not investment advice. The sample is illustrative.</span>
        </div>
      </footer>
    </div>
  );
}

function Th({ label, onClick, active, asc }: { label: string; onClick: () => void; active: boolean; asc: boolean }) {
  return (
    <th className="px-4 py-2.5 text-left">
      <button onClick={onClick} className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: active ? GS.indigo : "#64748b" }}>
        {label}
        <span className="text-[9px]" style={{ opacity: active ? 1 : 0.3 }}>{active ? (asc ? "▲" : "▼") : "▲"}</span>
      </button>
    </th>
  );
}

function FeatureChip({ icon, color, children }: { icon: React.ReactNode; color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-slate shadow-card">
      <span className="grid h-5 w-5 place-items-center rounded-md" style={{ background: `${color}16`, color }}>{icon}</span>
      {children}
    </span>
  );
}
