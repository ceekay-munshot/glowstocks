"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName } from "./Icon";

// A dedicated, animated research-progress screen. Every label is phrased as what
// a RESEARCH ANALYST does — NEVER a tool, vendor or backend. It is driven by the
// parent's live status (running → ready/error) and cycles the analyst steps on a
// timer during the long research phase.

const STEPS: { label: string; icon: IconName }[] = [
  { label: "Starting your research…", icon: "play" },
  { label: "Gathering the company's financial data…", icon: "bars" },
  { label: "Reading the latest annual report…", icon: "doc" },
  { label: "Going through recent earnings-call transcripts…", icon: "mic" },
  { label: "Reviewing the investor presentation…", icon: "layers" },
  { label: "Analysing financials, segments & peers…", icon: "scale" },
  { label: "Scanning recent news, risks & deals…", icon: "shield" },
  { label: "Compiling the report with sources…", icon: "link" },
  { label: "Finalising your report…", icon: "sparkles" },
];
// Hold here until the report is actually ready (don't let the timer claim "done").
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

  return (
    <div style={{ minHeight: "calc(100vh - 48px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px" }}>
      <div className="gs-rise gs-card" style={{ width: "min(640px, 100%)", overflow: "hidden" }}>
        <span className="gs-card__bar" style={{ background: error ? "linear-gradient(90deg,#e11d48,#e11d4800)" : "linear-gradient(90deg,#2563eb,#7c3aed)" }} />
        <div style={{ padding: "26px 28px 10px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 16, marginBottom: 14, background: error ? "#fff1f2" : "linear-gradient(135deg,#eff6ff,#f5f3ff)", border: `1px solid ${error ? "#fecdd3" : "#e0e7ff"}` }}>
            {error ? (
              <Icon name="alert" size={26} color="#e11d48" />
            ) : ready ? (
              <Icon name="check" size={28} color="#16a34a" strokeWidth={2.6} />
            ) : (
              <span className="gs-spin" style={{ width: 26, height: 26, border: "3px solid #dbeafe", borderTopColor: "#2563eb", borderRadius: "50%" }} />
            )}
          </div>
          <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, letterSpacing: "-0.01em" }}>
            {error ? "Research didn't finish" : ready ? "Your report is ready" : "Researching " + company}
          </h2>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-muted)" }}>
            {error
              ? "Something interrupted this research run."
              : ready
                ? `A fresh, source-backed report for ${ticker} is ready to view.`
                : "Our analyst is working through the company's disclosures. This usually takes a few minutes."}
          </p>
        </div>

        {/* progress rail */}
        {!error && (
          <div style={{ height: 4, background: "#eef2f7", margin: "14px 28px 6px", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.round((Math.min(current, STEPS.length) / STEPS.length) * 100)}%`, background: "linear-gradient(90deg,#2563eb,#7c3aed,#0d9488)", borderRadius: 4, transition: "width 0.6s ease" }} />
          </div>
        )}

        {/* steps */}
        {!error && (
          <div style={{ padding: "12px 28px 8px", display: "flex", flexDirection: "column", gap: 3 }}>
            {STEPS.map((s, i) => {
              const done = i < current;
              const active = i === current && !ready;
              return (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0", opacity: done || active ? 1 : 0.45, transition: "opacity 0.3s" }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", background: done ? "#f0fdf4" : active ? "#eff6ff" : "#f1f5f9", border: `1px solid ${done ? "#bbf7d0" : active ? "#dbeafe" : "#e2e8f0"}`, color: done ? "#16a34a" : active ? "#2563eb" : "#94a3b8" }}>
                    {done ? <Icon name="check" size={16} color="#16a34a" strokeWidth={2.6} /> : <Icon name={s.icon} size={15} color={active ? "#2563eb" : "#94a3b8"} />}
                  </span>
                  <span className={active ? "gs-pulse" : undefined} style={{ fontSize: 13.5, fontWeight: active || done ? 650 : 500, color: done ? "var(--text-secondary)" : active ? "var(--text-primary)" : "var(--text-muted)" }}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <div style={{ padding: "4px 28px 8px", textAlign: "center" }}>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.55 }}>
              {errorText ?? "Your research is taking a little longer than usual — please try again shortly."}
            </p>
          </div>
        )}

        {/* action */}
        <div style={{ padding: "12px 28px 26px", display: "flex", gap: 10, justifyContent: "center" }}>
          {ready ? (
            <button onClick={onView} style={{ height: 46, padding: "0 26px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 8px 20px rgba(79,70,229,0.3)" }}>
              View full dashboard <Icon name="chevronRight" size={18} color="#fff" />
            </button>
          ) : error ? (
            <button onClick={onBack} style={{ height: 42, padding: "0 20px", borderRadius: 10, border: "1px solid var(--border-default)", background: "#fff", color: "var(--text-secondary)", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
              <Icon name="arrowLeft" size={16} color="var(--text-secondary)" /> Back to search
            </button>
          ) : (
            <span style={{ fontSize: 12, color: "var(--text-hint)" }}>You can keep this page open — it updates on its own.</span>
          )}
        </div>
      </div>
    </div>
  );
}
