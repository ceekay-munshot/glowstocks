"use client";

import { useEffect, useState } from "react";
import { Play, BarChart3, FileText, Mic, Layers, Scale, Shield, Link2, Sparkles, Check, TriangleAlert, ArrowLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { GS } from "@/lib/brand";

// A dedicated, animated research-progress screen. Every label is phrased as what a
// RESEARCH ANALYST does — never a tool, vendor or backend.
const STEPS: { label: string; icon: LucideIcon }[] = [
  { label: "Starting your research…", icon: Play },
  { label: "Gathering the company's financial data…", icon: BarChart3 },
  { label: "Reading the latest annual report…", icon: FileText },
  { label: "Going through recent earnings-call transcripts…", icon: Mic },
  { label: "Reviewing the investor presentation…", icon: Layers },
  { label: "Analysing financials, segments & peers…", icon: Scale },
  { label: "Scanning recent news, risks & deals…", icon: Shield },
  { label: "Compiling the report with sources…", icon: Link2 },
  { label: "Finalising your report…", icon: Sparkles },
];
const HOLD_AT = STEPS.length - 1;

export function ProgressScreen({
  company,
  ticker,
  status,
  onView,
  onBack,
  errorText,
}: {
  company: string;
  ticker: string;
  status: "running" | "ready" | "error";
  onView: () => void;
  onBack: () => void;
  errorText?: string;
}) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (status !== "running") return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, HOLD_AT)), 6000);
    return () => clearInterval(t);
  }, [status]);

  const ready = status === "ready";
  const error = status === "error";
  const current = ready ? STEPS.length : step;
  const pct = Math.round((Math.min(current, STEPS.length) / STEPS.length) * 100);

  return (
    <div className="flex items-start justify-center px-5 py-10" style={{ minHeight: "calc(100vh - 48px)" }}>
      <div className="animate-fade-up w-full max-w-[620px] overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-pop">
        <span className="block h-[3px]" style={{ background: error ? `linear-gradient(90deg, ${GS.rose}, ${GS.rose}00)` : `linear-gradient(90deg, ${GS.indigo}, ${GS.violet})` }} />
        <div className="px-7 pt-6 text-center">
          <div className="mb-3 inline-grid h-14 w-14 place-items-center rounded-2xl border" style={{ background: error ? `${GS.rose}0f` : `${GS.indigo}0d`, borderColor: error ? `${GS.rose}33` : `${GS.indigo}22` }}>
            {error ? <TriangleAlert size={26} style={{ color: GS.rose }} /> : ready ? <Check size={28} strokeWidth={2.6} style={{ color: GS.green }} /> : <span className="gs-spin h-6 w-6 rounded-full border-[3px]" style={{ borderColor: `${GS.indigo}30`, borderTopColor: GS.indigo }} />}
          </div>
          <h2 className="text-[20px] font-extrabold leading-tight text-ink">
            {error ? "Research didn't finish" : ready ? "Your report is ready" : `Researching ${company}`}
          </h2>
          <p className="mt-1 text-[13.5px] text-grey">
            {error
              ? "Something interrupted this research run."
              : ready
                ? `A fresh, source-backed report for ${ticker} is ready to view.`
                : "Our analyst is working through the company's disclosures. This usually takes a few minutes."}
          </p>
        </div>

        {!error && (
          <div className="mx-7 mt-4 h-1 overflow-hidden rounded-full bg-slate-100" style={{ background: "#eef1f6" }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${GS.indigo}, ${GS.violet}, ${GS.teal})` }} />
          </div>
        )}

        {!error ? (
          <div className="flex flex-col gap-0.5 px-7 py-3">
            {STEPS.map((s, i) => {
              const done = i < current;
              const active = i === current && !ready;
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center gap-3 py-1.5 transition-opacity" style={{ opacity: done || active ? 1 : 0.45 }}>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border" style={{ background: done ? `${GS.green}12` : active ? `${GS.indigo}10` : "#f1f5f9", borderColor: done ? `${GS.green}33` : active ? `${GS.indigo}2a` : "#e2e8f0", color: done ? GS.green : active ? GS.indigo : "#94a3b8" }}>
                    {done ? <Check size={15} strokeWidth={2.6} /> : <Icon size={14} />}
                  </span>
                  <span className={`text-[13.5px] ${active ? "gs-pulse font-semibold text-ink" : done ? "font-semibold text-slate" : "text-grey"}`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-7 pb-2 pt-1 text-center">
            <p className="text-[13.5px] leading-relaxed text-slate">{errorText ?? "Your research is taking a little longer than usual — please try again shortly."}</p>
          </div>
        )}

        <div className="flex justify-center gap-2.5 px-7 pb-7 pt-3">
          {ready ? (
            <button onClick={onView} className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[15px] font-extrabold text-white shadow-pop" style={{ background: `linear-gradient(135deg, ${GS.indigo}, ${GS.violet})` }}>
              View full dashboard <ChevronRight size={18} />
            </button>
          ) : error ? (
            <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-5 py-2.5 text-[14px] font-bold text-slate">
              <ArrowLeft size={16} /> Back to search
            </button>
          ) : (
            <span className="text-[12px] text-faint">You can keep this page open — it updates on its own.</span>
          )}
        </div>
      </div>
    </div>
  );
}
