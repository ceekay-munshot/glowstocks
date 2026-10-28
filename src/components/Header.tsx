"use client";

import { useState } from "react";
import { ArrowLeft, RefreshCw, Download, FileText, Sheet, ChevronRight } from "lucide-react";
import type { CompanyReport } from "@/lib/types/report";
import { GS, logoGradient } from "@/lib/brand";
import { CompanySearch } from "./CompanySearch";

function LogoChip({ ticker }: { ticker: string }) {
  const g = logoGradient(ticker);
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[10px] font-extrabold text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}>
      {ticker.replace(/[^A-Z0-9]/gi, "").slice(0, 3).toUpperCase()}
    </span>
  );
}

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
    <header className="gs-header sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between gap-3 border-b border-black/[0.06] bg-white/85 px-4 backdrop-blur">
      <div className="flex min-w-0 items-center gap-2.5">
        <button onClick={onBack} title="Back to search" aria-label="Back to search" className="grid h-7 w-8 shrink-0 place-items-center rounded-lg border border-black/10 bg-white text-slate">
          <ArrowLeft size={17} />
        </button>
        {pillTicker && <LogoChip ticker={pillTicker} />}
        <div className="gs-hide-sm min-w-0 leading-tight">
          <div className="flex items-center gap-2">
            <span className="max-w-[240px] truncate text-[13.5px] font-extrabold text-ink">{report?.company ?? pillTicker}</span>
            {report?.is_sample && (
              <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ background: `${GS.amber}18`, color: GS.amber }}>sample</span>
            )}
          </div>
          <div className="text-[10.5px] font-semibold text-grey">
            {pillTicker}
            {report ? ` · ${report.exchange}` : ""}
          </div>
        </div>
      </div>

      <div className="gs-actions flex items-center gap-2">
        <CompanySearch onSelect={onSelect} />
        <button onClick={onRun} disabled={running} title="Refresh this research" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 text-[12.5px] font-bold text-slate disabled:opacity-60">
          <RefreshCw size={14} className={running ? "gs-spin" : undefined} />
          <span className="gs-hide-sm">{running ? "Updating…" : "Update"}</span>
        </button>
        <div className="relative">
          <button onClick={() => setMenu((m) => !m)} disabled={!report || exporting} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-bold text-white disabled:opacity-60" style={{ background: GS.indigo }}>
            <Download size={14} />
            <span className="gs-hide-sm">{exporting ? "Exporting…" : "Export"}</span>
          </button>
          {menu && report && (
            <div onMouseLeave={() => setMenu(false)} className="absolute right-0 top-10 z-40 min-w-[220px] rounded-xl border border-black/[0.06] bg-white p-1.5 shadow-pop">
              <MenuItem icon={<FileText size={15} />} label="One-pager (PDF)" hint="Landscape visual · print" onClick={() => { setMenu(false); onExportPdf(); }} />
              <MenuItem icon={<FileText size={15} />} label="Full report (PDF)" hint="Multi-page · all sections" onClick={() => { setMenu(false); onExportFullPdf(); }} />
              <MenuItem icon={<Sheet size={15} />} label="Full data (Excel)" hint="All 13 sections + sources" onClick={() => { setMenu(false); onExportExcel(); }} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuItem({ icon, label, hint, onClick }: { icon: React.ReactNode; label: string; hint: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-black/[0.03]">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: `${GS.indigo}14`, color: GS.indigo }}>{icon}</span>
      <span>
        <span className="block text-[12.5px] font-bold text-ink">{label}</span>
        <span className="block text-[11px] text-grey">{hint}</span>
      </span>
    </button>
  );
}

export function MiniHeader({ onBack, ticker, company }: { onBack: () => void; ticker: string; company?: string }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-black/[0.06] bg-white/85 px-4 backdrop-blur">
      <button onClick={onBack} aria-label="Back to search" className="grid h-7 w-8 place-items-center rounded-lg border border-black/10 bg-white text-slate">
        <ArrowLeft size={17} />
      </button>
      <h1 className="text-[14.5px] font-extrabold text-ink">
        glow<span style={{ color: GS.indigo }}>stocks</span>
      </h1>
      <ChevronRight size={14} className="text-faint" />
      <span className="text-[12.5px] font-semibold text-grey">{company || ticker}</span>
    </header>
  );
}
