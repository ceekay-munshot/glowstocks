"use client";

import { useState } from "react";
import type { CompanyReport } from "@/lib/types/report";
import { logoGradient } from "@/lib/theme";
import { CompanySearch } from "./CompanySearch";
import { Icon } from "./Icon";

function LogoChip({ ticker }: { ticker: string }) {
  const g = logoGradient(ticker);
  return (
    <span style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: `linear-gradient(135deg, ${g.from}, ${g.to})`, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 800, boxShadow: "0 2px 5px rgba(15,23,42,0.2)" }}>
      {ticker.replace(/[^A-Z0-9]/gi, "").slice(0, 3).toUpperCase()}
    </span>
  );
}

const btn = (primary = false): React.CSSProperties => ({
  height: 30,
  padding: "0 12px",
  borderRadius: 8,
  fontSize: 12.5,
  fontWeight: 700,
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
  ticker,
  running,
  exporting,
  onBack,
  onSelect,
  onRun,
  onExportExcel,
  onExportPdf,
  onExportFullPdf,
}: {
  report: CompanyReport | null;
  ticker: string;
  running: boolean;
  exporting: boolean;
  onBack: () => void;
  onSelect: (ticker: string, name: string) => void;
  onRun: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onExportFullPdf: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const pillTicker = report?.ticker ?? ticker;

  return (
    <header
      className="gs-header"
      style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "0 16px", height: 48, background: "var(--header-bar)", backdropFilter: "blur(8px)", borderBottom: "1px solid var(--border-default)", flexShrink: 0 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <button onClick={onBack} title="Back to search" aria-label="Back to search" style={{ height: 30, width: 32, borderRadius: 8, border: "1px solid var(--border-default)", background: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name="arrowLeft" size={17} color="var(--text-secondary)" />
        </button>
        {pillTicker && <LogoChip ticker={pillTicker} />}
        <div className="gs-hide-sm" style={{ minWidth: 0, lineHeight: 1.1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240 }}>
              {report?.company ?? pillTicker}
            </span>
            {report?.is_sample && (
              <span style={{ fontSize: 9.5, fontWeight: 700, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 5, padding: "1px 6px", letterSpacing: "0.03em" }}>SAMPLE</span>
            )}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--text-hint)", fontWeight: 600 }}>{pillTicker}{report ? ` · ${report.exchange}` : ""}</div>
        </div>
      </div>

      <div className="gs-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <CompanySearch onSelect={onSelect} />

        <button style={btn(false)} onClick={onRun} disabled={running} title="Refresh this research">
          <Icon name="refresh" size={14} color="var(--text-secondary)" className={running ? "gs-spin" : undefined} />
          <span className="gs-hide-sm">{running ? "Updating…" : "Update"}</span>
        </button>

        <div style={{ position: "relative" }}>
          <button style={btn(true)} onClick={() => setMenu((m) => !m)} disabled={!report || exporting}>
            <Icon name="download" size={14} color="#fff" />
            <span className="gs-hide-sm">{exporting ? "Exporting…" : "Export"}</span>
          </button>
          {menu && report && (
            <div onMouseLeave={() => setMenu(false)} style={{ position: "absolute", right: 0, top: 36, zIndex: 40, background: "#fff", border: "1px solid var(--border-default)", borderRadius: 12, boxShadow: "0 14px 36px rgba(15,23,42,0.16)", padding: 5, minWidth: 210 }}>
              <MenuItem icon="doc" label="One-pager (PDF)" hint="Landscape visual · print" onClick={() => { setMenu(false); onExportPdf(); }} />
              <MenuItem icon="doc" label="Full report (PDF)" hint="Multi-page · all sections" onClick={() => { setMenu(false); onExportFullPdf(); }} />
              <MenuItem icon="bars" label="Full data (Excel)" hint="All 13 sections + sources" onClick={() => { setMenu(false); onExportExcel(); }} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuItem({ icon, label, hint, onClick }: { icon: "doc" | "bars"; label: string; hint: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="gs-rowh"
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", border: "none", background: "transparent", borderRadius: 9, padding: "8px 10px", cursor: "pointer" }}
    >
      <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--primary-light)", color: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={icon} size={15} color="var(--primary)" />
      </span>
      <span>
        <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)" }}>{label}</span>
        <span style={{ display: "block", fontSize: 11, color: "var(--text-hint)" }}>{hint}</span>
      </span>
    </button>
  );
}
