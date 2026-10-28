"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { type CompanyReport } from "@/lib/types/report";
import { TABS, TAB_MAP, coverageAccent, type TabKey } from "@/lib/theme";
import { AccentScope } from "./AccentScope";
import { Header } from "./Header";
import { Icon } from "./Icon";
import { ProgressScreen } from "./ProgressScreen";
import { WidgetCard } from "./WidgetCard";
import { ChartSkeleton } from "./states";
import { Grid } from "./tabs/Grid";
import { SnapshotTab } from "./tabs/SnapshotTab";
import { BusinessTab } from "./tabs/BusinessTab";
import { FinancialsTab } from "./tabs/FinancialsTab";
import { PeersTab } from "./tabs/PeersTab";
import { ThesisTab } from "./tabs/ThesisTab";
import { SourcesPanel, SourceTrail } from "./tabs/SourcesPanel";
import { CustomersCapacityTab } from "./tabs/CustomersCapacityTab";
import { GrowthConcallTab } from "./tabs/GrowthConcallTab";
import { EstimatesSection } from "./tabs/EstimatesSection";
import { RisksSection } from "./tabs/RisksSection";
import { MnaSection } from "./tabs/MnaSection";
import { IntegritySection } from "./tabs/IntegritySection";

type RunPhase = "running" | "ready" | "error" | null;

export function CompanyView({
  ticker,
  initialReport,
  autoRun = false,
}: {
  ticker: string;
  initialReport: CompanyReport | null;
  autoRun?: boolean;
}) {
  const router = useRouter();
  const [report, setReport] = useState<CompanyReport | null>(initialReport);
  const [tab, setTab] = useState<TabKey>("snapshot");
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
      const res = await fetch("/api/report/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticker, company: report?.company ?? "" }),
      });
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

  // Initial load: fetch the report if the server didn't bundle one; kick off a
  // run when arriving with ?run=1 (the "Update" / "Research" action).
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
      /* swallow — a toast would go here */
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

  // The research-progress screen takes over the whole view while a run is live
  // or just finished (until the person clicks through to the dashboard).
  if (phase) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <MiniHeader onBack={goBack} ticker={ticker} company={report?.company} />
        <ProgressScreen
          company={report?.company || ticker}
          ticker={ticker}
          status={phase}
          onView={() => setPhase(null)}
          onBack={goBack}
          errorText={errorText}
        />
      </div>
    );
  }

  const accent = TAB_MAP[tab].accent;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <Header
        report={report}
        ticker={ticker}
        running={false}
        exporting={exporting}
        onBack={goBack}
        onSelect={selectCompany}
        onRun={startRun}
        onExportExcel={exportExcel}
        onExportPdf={exportPdf}
        onExportFullPdf={exportFullPdf}
      />

      {/* Sub-nav + coverage */}
      <div style={{ flexShrink: 0, borderBottom: "1px solid var(--border-default)", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)" }}>
        <div className="gs-scroll" style={{ display: "flex", alignItems: "center", gap: 18, padding: "0 20px", overflowX: "auto" }}>
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button key={t.key} className="gs-tabv" onClick={() => setTab(t.key)} style={{ color: on ? t.accent.main : undefined }}>
                <Icon name={t.icon} size={15} color={on ? t.accent.main : "var(--text-muted)"} />
                <span>
                  {t.key === "sources" && report ? `${t.short} (${report.sources.length})` : t.short}
                </span>
                {on && <span style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2.5, borderRadius: 3, background: t.accent.main }} />}
              </button>
            );
          })}
        </div>
        {report && <CoverageBar report={report} />}
      </div>

      {/* Zone 2 — the only scrolling area */}
      <main className="gs-scroll" style={{ flex: 1, overflow: "auto", padding: "22px 24px 44px" }}>
        <div className="gs-maxw">
          {loading ? (
            <LoadingGrid />
          ) : notFound ? (
            <NotFoundCard ticker={ticker} onRun={startRun} />
          ) : report ? (
            <AccentScope accent={accent}>
              {tab === "snapshot" && <SnapshotTab report={report} />}
              {tab === "business" && <BusinessTab report={report} />}
              {tab === "customers" && <CustomersCapacityTab report={report} />}
              {tab === "financials" && <FinancialsTab report={report} />}
              {tab === "growth" && <GrowthConcallTab report={report} />}
              {tab === "peers" && (
                <>
                  <PeersTab report={report} />
                  <EstimatesSection report={report} />
                </>
              )}
              {tab === "thesis" && (
                <>
                  <ThesisTab report={report} />
                  <RisksSection report={report} />
                  <MnaSection report={report} />
                </>
              )}
              {tab === "sources" && (
                <>
                  <SourcesPanel sources={report.sources} updated={report.last_updated} />
                  <IntegritySection report={report} />
                </>
              )}
              {tab !== "sources" && <SourceTrail sources={report.sources} updated={report.last_updated} onViewAll={() => setTab("sources")} />}
            </AccentScope>
          ) : (
            <NotFoundCard ticker={ticker} onRun={startRun} />
          )}
        </div>
      </main>

      <footer style={{ flexShrink: 0, borderTop: "1px solid var(--border-default)", background: "var(--card-header)", padding: "8px 24px" }}>
        <div style={{ maxWidth: 1640, margin: "0 auto", fontSize: 11, color: "var(--text-hint)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span>glowstocks · source-backed equity research · India (NSE/BSE)</span>
          <span>{report ? `Updated ${report.last_updated.slice(0, 10)} · ${report.currency} · figures in INR crore` : "Not investment advice"}</span>
        </div>
      </footer>
    </div>
  );
}

function MiniHeader({ onBack, ticker, company }: { onBack: () => void; ticker: string; company?: string }) {
  return (
    <header className="gs-header" style={{ display: "flex", alignItems: "center", gap: 10, height: 48, padding: "0 16px", background: "var(--header-bar)", backdropFilter: "blur(8px)", borderBottom: "1px solid var(--border-default)", flexShrink: 0 }}>
      <button onClick={onBack} aria-label="Back to search" style={{ height: 30, width: 32, borderRadius: 8, border: "1px solid var(--border-default)", background: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="arrowLeft" size={17} color="var(--text-secondary)" />
      </button>
      <h1 style={{ fontSize: 14.5, fontWeight: 800, margin: 0 }}>
        glow<span style={{ color: "var(--primary)" }}>stocks</span>
      </h1>
      <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>· {company || ticker}</span>
    </header>
  );
}

const COVERAGE_ORDER = [
  "snapshot", "business", "financials", "peers", "thesis",
  "customers", "capacity", "growth", "concall", "mna", "estimates", "risks", "integrity",
] as const;

function CoverageBar({ report }: { report: CompanyReport }) {
  const cov = report.coverage as unknown as Record<string, boolean | undefined>;
  const done = COVERAGE_ORDER.filter((k) => cov[k]).length;
  const a = coverageAccent(done, COVERAGE_ORDER.length);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 20px 9px", flexWrap: "wrap" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: a.main, background: a.soft, border: `1px solid ${a.line}`, borderRadius: 99, padding: "2px 9px" }}>
        <Icon name="check" size={12} color={a.main} /> {done}/{COVERAGE_ORDER.length} sections
      </span>
      {COVERAGE_ORDER.map((k) => {
        const on = !!cov[k];
        return (
          <span key={k} title={k} style={{ fontSize: 10, fontWeight: 600, textTransform: "capitalize", padding: "2px 8px", borderRadius: 99, color: on ? "#15803d" : "var(--text-hint)", background: on ? "#f0fdf4" : "#f1f5f9", border: `1px solid ${on ? "#bbf7d0" : "var(--border-default)"}` }}>
            {on ? "✓" : "○"} {k}
          </span>
        );
      })}
    </div>
  );
}

function NotFoundCard({ ticker, onRun }: { ticker: string; onRun: () => void }) {
  return (
    <Grid>
      <WidgetCard title="Not researched yet" subtitle={`No report on file for ${ticker}`} icon="search" span={3}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 180, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          <div style={{ fontSize: 14.5, color: "var(--text-secondary)", maxWidth: 440, lineHeight: 1.5 }}>
            Start a fresh, source-backed research report for <b>{ticker}</b> — financials, peers, growth, risks and more, every figure traced to its source.
          </div>
          <button onClick={onRun} style={{ height: 44, padding: "0 24px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 8px 20px rgba(79,70,229,0.28)" }}>
            <Icon name="sparkles" size={18} color="#fff" /> Start research
          </button>
        </div>
      </WidgetCard>
    </Grid>
  );
}

function LoadingGrid() {
  return (
    <Grid>
      {[0, 1, 2, 3].map((i) => (
        <WidgetCard key={i} title="Loading…" icon="gauge" span={i === 0 ? 2 : undefined}>
          <ChartSkeleton />
        </WidgetCard>
      ))}
    </Grid>
  );
}
