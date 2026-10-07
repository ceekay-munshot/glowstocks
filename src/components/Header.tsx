"use client";

import { useState } from "react";
import type { CompanyReport } from "@/lib/types/report";
import { CompanySearch } from "./CompanySearch";

function TickerPill({ ticker, company }: { ticker: string; company?: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 10px",
        background: "var(--primary-light)",
        color: "var(--primary-text)",
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 600,
        border: "1px solid var(--primary-border)",
        maxWidth: 260,
      }}
    >
      <span style={{ width: 6, height: 6, background: "var(--primary)", borderRadius: "50%" }} />
      {ticker}
      {company && <span style={{ color: "#818cf8", fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>· {company}</span>}
    </span>
  );
}

const btn = (primary = false): React.CSSProperties => ({
  height: 30,
  padding: "0 12px",
  borderRadius: 8,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  border: primary ? "none" : "1px solid var(--border-default)",
  background: primary ? "var(--primary)" : "#fff",
  color: primary ? "#fff" : "var(--text-secondary)",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
});

export function Header({
  report,
  running,
  exporting,
  onSelect,
  onRun,
  onExportExcel,
  onExportPdf,
}: {
  report: CompanyReport | null;
  running: boolean;
  exporting: boolean;
  onSelect: (ticker: string, name: string) => void;
  onRun: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
}) {
  const [menu, setMenu] = useState(false);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "0 20px",
        height: 48,
        background: "var(--header-bar)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid #e5e7eb",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <h1 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0, whiteSpace: "nowrap" }}>
          glow<span style={{ color: "var(--primary)" }}>stocks</span>
        </h1>
        {report && <TickerPill ticker={report.ticker} company={report.company} />}
        {report?.is_sample && (
          <span style={{ fontSize: 10, fontWeight: 600, color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "2px 7px", whiteSpace: "nowrap" }}>
            SAMPLE
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <CompanySearch onSelect={onSelect} />

        <button style={btn(true)} onClick={onRun} disabled={running || !report} title="Run the research engine for this company">
          {running ? "Running…" : report?.is_sample ? "Run live" : "Refresh"}
        </button>

        <div style={{ position: "relative" }}>
          <button style={btn()} onClick={() => setMenu((m) => !m)} disabled={!report || exporting}>
            {exporting ? "Exporting…" : "Export ▾"}
          </button>
          {menu && report && (
            <div
              onMouseLeave={() => setMenu(false)}
              style={{ position: "absolute", right: 0, top: 36, zIndex: 40, background: "#fff", border: "1px solid var(--border-default)", borderRadius: 10, boxShadow: "0 12px 32px rgba(0,0,0,0.12)", padding: 4, minWidth: 180 }}
            >
              <MenuItem label="Excel workbook (.xlsx)" hint="Full v1 data + Sources" onClick={() => { setMenu(false); onExportExcel(); }} />
              <MenuItem label="One-pager (PDF)" hint="Visual snapshot · print" onClick={() => { setMenu(false); onExportPdf(); }} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuItem({ label, hint, onClick }: { label: string; hint: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: "transparent", borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-light)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)" }}>{label}</div>
      <div style={{ fontSize: 11, color: "var(--text-hint)" }}>{hint}</div>
    </button>
  );
}
