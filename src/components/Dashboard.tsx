"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SECTION_KEYS, type CompanyReport, type SectionKey } from "@/lib/types/report";
import { Header } from "./Header";
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

type Tab =
  | "snapshot" | "business" | "customers" | "financials" | "growth" | "peers" | "thesis" | "sources";
const TABS: { key: Tab; label: string }[] = [
  { key: "snapshot", label: "Snapshot" },
  { key: "business", label: "Business" },
  { key: "customers", label: "Customers & Capacity" },
  { key: "financials", label: "Financials" },
  { key: "growth", label: "Growth & Concall" },
  { key: "peers", label: "Peers & Estimates" },
  { key: "thesis", label: "Thesis & Risks" },
];

const COVERAGE_KEYS: SectionKey[] = [...SECTION_KEYS];

export function Dashboard({ initialReport }: { initialReport: CompanyReport | null }) {
  const [report, setReport] = useState<CompanyReport | null>(initialReport);
  const [tab, setTab] = useState<Tab>("snapshot");
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("");
  const [runUrl, setRunUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "info" | "error"; text: string } | null>(null);
  const [notFound, setNotFound] = useState<{ ticker: string; name: string } | null>(null);
  const [exporting, setExporting] = useState(false);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (poll.current) {
      clearInterval(poll.current);
      poll.current = null;
    }
  }, []);
  useEffect(() => () => stopPolling(), [stopPolling]);

  const loadReport = useCallback(async (ticker: string): Promise<boolean> => {
    const res = await fetch(`/api/report/get?ticker=${encodeURIComponent(ticker)}`);
    const data = (await res.json()) as { found?: boolean; report?: CompanyReport };
    if (data.found && data.report) {
      setReport(data.report);
      return true;
    }
    return false;
  }, []);

  const handleSelect = useCallback(
    async (ticker: string, name: string) => {
      setNotice(null);
      setNotFound(null);
      if (report && report.ticker === ticker) {
        setTab("snapshot");
        return;
      }
      setLoading(true);
      try {
        const ok = await loadReport(ticker);
        if (ok) setTab("snapshot");
        else setNotFound({ ticker, name });
      } catch {
        setNotice({ kind: "error", text: "Could not load that report." });
      } finally {
        setLoading(false);
      }
    },
    [report, loadReport],
  );

  const startPolling = useCallback(
    (ticker: string) => {
      stopPolling();
      let ticks = 0;
      poll.current = setInterval(async () => {
        ticks += 1;
        if (ticks > 160) {
          stopPolling();
          setRunning(false);
          setNotice({ kind: "error", text: "Run is taking unusually long — check the Actions run." });
          return;
        }
        try {
          const res = await fetch(`/api/report/status?ticker=${encodeURIComponent(ticker)}`);
          const data = (await res.json()) as { phase?: string; ready?: boolean; done?: boolean; runUrl?: string };
          setPhase(data.phase ?? "");
          if (data.runUrl) setRunUrl(data.runUrl);
          if (data.ready) {
            stopPolling();
            const ok = await loadReport(ticker);
            setRunning(false);
            setTab("snapshot");
            if (!ok) setNotice({ kind: "info", text: "Run finished — report not readable yet, retry shortly." });
          } else if (data.done && data.phase && data.phase !== "success") {
            stopPolling();
            setRunning(false);
            setNotice({ kind: "error", text: `Run ended: ${data.phase}.` });
          }
        } catch {
          /* transient — keep polling */
        }
      }, 6000);
    },
    [stopPolling, loadReport],
  );

  const handleRun = useCallback(
    async (ticker: string, name: string) => {
      setNotice(null);
      setNotFound(null);
      setRunning(true);
      setPhase("dispatching");
      setRunUrl(null);
      try {
        const res = await fetch("/api/report/run", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ticker, company: name }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!data.ok) {
          setRunning(false);
          setNotice({ kind: "info", text: data.error ?? "Run couldn't be dispatched." });
          return;
        }
        setPhase("queued");
        startPolling(ticker);
      } catch {
        setRunning(false);
        setNotice({ kind: "error", text: "Run request failed." });
      }
    },
    [startPolling],
  );

  const exportExcel = useCallback(async () => {
    if (!report) return;
    setExporting(true);
    try {
      const res = await fetch("/api/export/excel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ report }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.ticker}-glowstocks.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setNotice({ kind: "error", text: "Excel export failed." });
    } finally {
      setExporting(false);
    }
  }, [report]);

  const exportPdf = useCallback(() => {
    if (!report) return;
    window.open(`/onepager/${encodeURIComponent(report.ticker)}`, "_blank", "noopener");
  }, [report]);

  const exportFullPdf = useCallback(() => {
    if (!report) return;
    window.open(`/report/${encodeURIComponent(report.ticker)}/print`, "_blank", "noopener");
  }, [report]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <Header
        report={report}
        running={running}
        exporting={exporting}
        onSelect={handleSelect}
        onRun={() => report && handleRun(report.ticker, report.company)}
        onExportExcel={exportExcel}
        onExportPdf={exportPdf}
        onExportFullPdf={exportFullPdf}
      />

      {/* Sub-nav + coverage bar */}
      <div style={{ flexShrink: 0, borderBottom: "1px solid var(--border-default)", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "0 24px", overflowX: "auto" }}>
          {TABS.map((t) => (
            <button key={t.key} className="gs-tab" data-active={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button className="gs-tab" data-active={tab === "sources"} onClick={() => setTab("sources")}>
            Sources &amp; Integrity{report ? ` (${report.sources.length})` : ""}
          </button>
        </div>
        {report && <CoverageBar report={report} />}
      </div>

      {/* Zone 2 — the only scrolling area */}
      <main className="gs-scroll" style={{ flex: 1, overflow: "auto", padding: "24px 24px 40px" }}>
        {notice && <Notice notice={notice} runUrl={runUrl} onClose={() => setNotice(null)} />}

        {running ? (
          <RunProgress phase={phase} runUrl={runUrl} />
        ) : loading ? (
          <LoadingGrid />
        ) : notFound ? (
          <NotFoundCard ticker={notFound.ticker} name={notFound.name} onRun={() => handleRun(notFound.ticker, notFound.name)} />
        ) : report ? (
          <>
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
          </>
        ) : (
          <WelcomeCard />
        )}
      </main>

      <footer style={{ flexShrink: 0, borderTop: "1px solid var(--border-default)", background: "var(--card-header)", padding: "8px 24px" }}>
        <div style={{ fontSize: 11, color: "var(--text-hint)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span>glowstocks · source-backed equity research · India (NSE/BSE)</span>
          <span>{report ? `Updated ${report.last_updated.slice(0, 10)} · ${report.currency} · ${report.units_note ? "figures in INR crore" : ""}` : "Not investment advice"}</span>
        </div>
      </footer>
    </div>
  );
}

function CoverageBar({ report }: { report: CompanyReport }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 24px 8px", flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, color: "var(--text-hint)" }}>Coverage:</span>
      {COVERAGE_KEYS.map((k) => {
        const on = report.coverage[k];
        return (
          <span key={k} style={{ fontSize: 10.5, fontWeight: 600, textTransform: "capitalize", padding: "2px 8px", borderRadius: 99, color: on ? "var(--status-good)" : "var(--text-hint)", background: on ? "#ecfdf3" : "#f3f4f6", border: `1px solid ${on ? "#bbf7d0" : "var(--border-default)"}` }}>
            {on ? "✓" : "○"} {k}
          </span>
        );
      })}
    </div>
  );
}

function Notice({ notice, runUrl, onClose }: { notice: { kind: "info" | "error"; text: string }; runUrl: string | null; onClose: () => void }) {
  const err = notice.kind === "error";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 14px", borderRadius: 10, fontSize: 13, background: err ? "var(--error-bg)" : "#eff6ff", border: `1px solid ${err ? "#fecaca" : "#dbeafe"}`, color: err ? "#b91c1c" : "#1d4ed8" }}>
      <span style={{ flex: 1 }}>{notice.text}</span>
      {runUrl && <a href={runUrl} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", fontWeight: 600 }}>View run ↗</a>}
      <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "inherit", fontSize: 16, lineHeight: 1 }}>×</button>
    </div>
  );
}

function RunProgress({ phase, runUrl }: { phase: string; runUrl: string | null }) {
  const label: Record<string, string> = { dispatching: "Dispatching workflow…", queued: "Queued on GitHub Actions…", in_progress: "Harvesting filings & extracting (this can take a few minutes)…" };
  return (
    <Grid>
      <WidgetCard title="Research in progress" subtitle={label[phase] ?? phase} category="analytics" span={3}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 160, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          <div className="gs-shimmer" style={{ width: 48, height: 48, borderRadius: "50%" }} />
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label[phase] ?? "Working…"}</div>
          {runUrl && <a href={runUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--primary)" }}>Follow the live run on GitHub ↗</a>}
          <div style={{ fontSize: 11, color: "var(--text-hint)", maxWidth: 420 }}>The robot reads Screener, the annual report, concalls & the web, then extracts a cited report. The page updates itself when it&apos;s ready.</div>
        </div>
      </WidgetCard>
    </Grid>
  );
}

function NotFoundCard({ ticker, name, onRun }: { ticker: string; name: string; onRun: () => void }) {
  return (
    <Grid>
      <WidgetCard title="No cached report yet" subtitle={`${name || ticker} hasn't been researched`} category="tools" span={3}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 160, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>Run the research robot to build a fresh, source-backed report for <b>{ticker}</b>.</div>
          <button onClick={onRun} style={{ height: 36, padding: "0 18px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            Run research for {ticker}
          </button>
          <div style={{ fontSize: 11, color: "var(--text-hint)" }}>A read-once cache means re-opening it later costs zero credits.</div>
        </div>
      </WidgetCard>
    </Grid>
  );
}

function WelcomeCard() {
  return (
    <Grid>
      <WidgetCard title="Search a company to begin" category="india" span={3}>
        <div style={{ minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-hint)", fontSize: 14 }}>
          Use the search box above to pick an Indian listed company, or enter a ticker.
        </div>
      </WidgetCard>
    </Grid>
  );
}

function LoadingGrid() {
  return (
    <Grid>
      {[0, 1, 2, 3].map((i) => (
        <WidgetCard key={i} title="Loading…" span={i === 0 ? 2 : undefined}>
          <ChartSkeleton />
        </WidgetCard>
      ))}
    </Grid>
  );
}
