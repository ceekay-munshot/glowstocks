"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, BarChart3, Factory, Scale, CheckCircle2 } from "lucide-react";
import { SECTION_KEYS, type CompanyReport } from "@/lib/types/report";
import { recordRun } from "@/lib/recentRuns";
import { GS, rampGYR } from "@/lib/brand";
import { Tabs, SubTabs, type TabDef } from "./ui/Tabs";
import { Header, MiniHeader } from "./Header";
import { ProgressScreen } from "./ProgressScreen";
import { ChartSkeleton } from "./ui/States";
import { Card, PageHeader } from "./ui/Card";
import { SnapshotScreen, BusinessScreen, GeographiesScreen } from "./screens/Overview";
import { ResultsScreen, HistoryScreen, PeersScreen } from "./screens/Financials";
import { CustomersScreen, CapacityScreen, GrowthScreen, ConcallScreen } from "./screens/Operations";
import { StanceScreen, RisksScreen, MnaScreen, SourcesScreen } from "./screens/Thesis";
import { Sparkles } from "lucide-react";

type TopKey = "overview" | "financials" | "operations" | "thesis";
type SubKey =
  | "snapshot" | "business" | "geographies"
  | "results" | "history" | "peers"
  | "customers" | "capacity" | "growth" | "concall"
  | "stance" | "risks" | "mna" | "sources";

const TOP_TABS: TabDef<TopKey>[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, color: GS.indigo },
  { key: "financials", label: "Financials", icon: BarChart3, color: GS.blue },
  { key: "operations", label: "Operations & Growth", icon: Factory, color: GS.teal },
  { key: "thesis", label: "Thesis & Risk", icon: Scale, color: GS.violet },
];

const SUBTABS: Record<TopKey, { key: SubKey; label: string; color: string }[]> = {
  overview: [
    { key: "snapshot", label: "Snapshot", color: GS.indigo },
    { key: "business", label: "Business & Segments", color: GS.violet },
    { key: "geographies", label: "Geographies", color: GS.cyan },
  ],
  financials: [
    { key: "results", label: "Results", color: GS.blue },
    { key: "history", label: "Financial Trends", color: GS.teal },
    { key: "peers", label: "Peers & Estimates", color: GS.amber },
  ],
  operations: [
    { key: "customers", label: "Customers & Order Book", color: GS.teal },
    { key: "capacity", label: "Capacity", color: GS.sky },
    { key: "growth", label: "Growth & Catalysts", color: GS.green },
    { key: "concall", label: "Concall", color: GS.violet },
  ],
  thesis: [
    { key: "stance", label: "Stance & Scenarios", color: GS.indigo },
    { key: "risks", label: "Risks", color: GS.rose },
    { key: "mna", label: "M&A", color: GS.teal },
    { key: "sources", label: "Sources & Integrity", color: GS.slate },
  ],
};

const SCREENS: Record<SubKey, (p: { report: CompanyReport }) => ReactNode> = {
  snapshot: SnapshotScreen,
  business: BusinessScreen,
  geographies: GeographiesScreen,
  results: ResultsScreen,
  history: HistoryScreen,
  peers: PeersScreen,
  customers: CustomersScreen,
  capacity: CapacityScreen,
  growth: GrowthScreen,
  concall: ConcallScreen,
  stance: StanceScreen,
  risks: RisksScreen,
  mna: MnaScreen,
  sources: SourcesScreen,
};

type RunPhase = "running" | "ready" | "error" | null;

export function CompanyView({ ticker, initialReport, autoRun = false }: { ticker: string; initialReport: CompanyReport | null; autoRun?: boolean }) {
  const router = useRouter();
  const [report, setReport] = useState<CompanyReport | null>(initialReport);
  const [top, setTop] = useState<TopKey>("overview");
  const [sub, setSub] = useState<SubKey>("snapshot");
  const [loading, setLoading] = useState(!initialReport && !autoRun);
  const [phase, setPhase] = useState<RunPhase>(null);
  const [errorText, setErrorText] = useState<string | undefined>(undefined);
  const [notFound, setNotFound] = useState(false);
  const [exporting, setExporting] = useState(false);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (poll.current) {
      clearInterval(poll.current);
      poll.current = null;
    }
  }, []);
  useEffect(() => () => stopPolling(), [stopPolling]);

  // Remember every opened/researched company so it shows in the landing
  // "Previous runs" table — including live tickers that aren't bundled offline.
  useEffect(() => {
    if (report) recordRun(report);
  }, [report]);

  const loadReport = useCallback(async (t: string): Promise<boolean> => {
    const res = await fetch(`/api/report/get?ticker=${encodeURIComponent(t)}`);
    const data = (await res.json()) as { found?: boolean; report?: CompanyReport };
    if (data.found && data.report) {
      setReport(data.report);
      return true;
    }
    return false;
  }, []);

  const startPolling = useCallback(
    (t: string) => {
      stopPolling();
      let ticks = 0;
      poll.current = setInterval(async () => {
        ticks += 1;
        if (ticks > 160) {
          stopPolling();
          setPhase("error");
          setErrorText("Your research is taking a little longer than usual — please try again shortly.");
          return;
        }
        try {
          const res = await fetch(`/api/report/status?ticker=${encodeURIComponent(t)}`);
          const data = (await res.json()) as { phase?: string; ready?: boolean; done?: boolean };
          if (data.ready) {
            stopPolling();
            const ok = await loadReport(t);
            setPhase(ok ? "ready" : "error");
            if (!ok) setErrorText("Your report is almost ready — please try again in a moment.");
          } else if (data.done && data.phase && data.phase !== "success") {
            stopPolling();
            setPhase("error");
            setErrorText("This research run didn't complete — please try again shortly.");
          }
        } catch {
          /* transient — keep polling */
        }
      }, 6000);
    },
    [stopPolling, loadReport],
  );

  const startRun = useCallback(async () => {
    setNotFound(false);
    setErrorText(undefined);
    setPhase("running");
    try {
      const res = await fetch("/api/report/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ticker, company: report?.company ?? "" }) });
      const data = (await res.json()) as { ok?: boolean };
      if (!data.ok) {
        setPhase("error");
        setErrorText("We couldn't start this research run just now — please try again shortly.");
        return;
      }
      startPolling(ticker);
    } catch {
      setPhase("error");
      setErrorText("We couldn't start this research run just now — please try again shortly.");
    }
  }, [ticker, report, startPolling]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (autoRun) {
        void startRun();
        return;
      }
      if (initialReport) return;
      setLoading(true);
      try {
        const ok = await loadReport(ticker);
        if (!cancelled && !ok) setNotFound(true);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stashForPrint = useCallback((rep: CompanyReport) => {
    try {
      localStorage.setItem(`gs:print:${rep.ticker}`, JSON.stringify({ at: Date.now(), report: rep }));
    } catch {
      /* storage blocked — the print route falls back to fetching by ticker */
    }
  }, []);

  const exportExcel = useCallback(async () => {
    if (!report) return;
    setExporting(true);
    try {
      const res = await fetch("/api/export/excel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ report }) });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.ticker}-glowstocks.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* swallow */
    } finally {
      setExporting(false);
    }
  }, [report]);

  const exportPdf = useCallback(() => {
    if (!report) return;
    stashForPrint(report);
    window.open(`/onepager/${encodeURIComponent(report.ticker)}`, "_blank", "noopener");
  }, [report, stashForPrint]);
  const exportFullPdf = useCallback(() => {
    if (!report) return;
    stashForPrint(report);
    window.open(`/report/${encodeURIComponent(report.ticker)}/print`, "_blank", "noopener");
  }, [report, stashForPrint]);

  const goBack = useCallback(() => router.push("/"), [router]);
  const selectCompany = useCallback((t: string) => router.push(`/company/${encodeURIComponent(t)}`), [router]);

  const changeTop = (k: TopKey) => {
    setTop(k);
    setSub(SUBTABS[k][0].key);
  };

  const Screen = SCREENS[sub];

  if (phase) {
    return (
      <div className="flex min-h-screen flex-col">
        <MiniHeader onBack={goBack} ticker={ticker} company={report?.company} />
        <ProgressScreen company={report?.company || ticker} ticker={ticker} status={phase} onView={() => setPhase(null)} onBack={goBack} errorText={errorText} />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header report={report} ticker={ticker} running={false} exporting={exporting} onBack={goBack} onSelect={selectCompany} onRun={startRun} onExportExcel={exportExcel} onExportPdf={exportPdf} onExportFullPdf={exportFullPdf} />

      {/* top tabs */}
      <div className="shrink-0 border-b border-black/[0.06] bg-white/75 backdrop-blur">
        <div className="mx-auto w-full max-w-[1640px] px-4 sm:px-6">
          <Tabs tabs={TOP_TABS} active={top} onChange={changeTop} />
        </div>
      </div>

      {/* subtabs + coverage */}
      <div className="shrink-0 border-b border-black/[0.06] bg-white/60 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1640px] flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
          <SubTabs tabs={SUBTABS[top]} active={sub} onChange={(k) => setSub(k)} />
          {report && <CoveragePill report={report} />}
        </div>
      </div>

      {/* content */}
      <main className="gs-scroll flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-[1640px] px-4 py-5 sm:px-6">
          {loading ? (
            <Card accent={GS.indigo}><ChartSkeleton /></Card>
          ) : notFound || !report ? (
            <NotFoundCard ticker={ticker} onRun={startRun} />
          ) : (
            <Screen report={report} />
          )}
        </div>
      </main>

      <footer className="shrink-0 border-t border-black/[0.06] bg-white/70 px-4 py-2 sm:px-6">
        <div className="mx-auto flex w-full max-w-[1640px] flex-wrap justify-between gap-2 text-[11px] text-grey">
          <span>glowstocks · source-backed equity research · India (NSE/BSE)</span>
          <span>{report ? `Updated ${report.last_updated.slice(0, 10)} · ${report.currency} · figures in INR crore` : "Not investment advice"}</span>
        </div>
      </footer>
    </div>
  );
}

function CoveragePill({ report }: { report: CompanyReport }) {
  const cov = report.coverage as unknown as Record<string, boolean | undefined>;
  const done = SECTION_KEYS.filter((k) => cov[k]).length;
  const total = SECTION_KEYS.length;
  const col = rampGYR(1 - done / total);
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold" style={{ background: `${col}16`, color: col, border: `1px solid ${col}33` }}>
      <CheckCircle2 size={13} /> {done}/{total} sections
    </span>
  );
}

function NotFoundCard({ ticker, onRun }: { ticker: string; onRun: () => void }) {
  return (
    <div className="mx-auto max-w-xl">
      <Card accent={GS.indigo}>
        <PageHeader icon={Sparkles} accent={GS.indigo} title="Not researched yet" subtitle={`No report on file for ${ticker}`} />
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <p className="max-w-md text-[14px] leading-relaxed text-slate">
            Start a fresh, source-backed research report for <b>{ticker}</b> — financials, peers, growth, risks and more, every figure traced to its source.
          </p>
          <button onClick={onRun} className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[15px] font-extrabold text-white shadow-pop" style={{ background: `linear-gradient(135deg, ${GS.indigo}, ${GS.violet})` }}>
            <Sparkles size={18} /> Start research
          </button>
        </div>
      </Card>
    </div>
  );
}
