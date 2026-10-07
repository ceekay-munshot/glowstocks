"use client";

import { useEffect, useState } from "react";
import type { CompanyReport, Metric } from "@/lib/types/report";
import { StancePill } from "../Stance";
import { citedText } from "@/lib/format";

export type LoadState = "loading" | "ready" | "missing";

/** Fetch a report for a print route (works on the committed sample with no keys). */
export function usePrintReport(ticker: string): { report: CompanyReport | null; state: LoadState } {
  const [report, setReport] = useState<CompanyReport | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  useEffect(() => {
    let cancelled = false;

    // 1. Prefer the report the dashboard handed off — exactly what was on
    //    screen when Export was clicked. One-shot: consumed on read.
    try {
      const raw = localStorage.getItem(`gs:print:${ticker}`);
      if (raw) {
        localStorage.removeItem(`gs:print:${ticker}`);
        const parsed = JSON.parse(raw) as { at?: number; report?: CompanyReport };
        if (parsed?.report?.ticker === ticker && Date.now() - (parsed.at ?? 0) < 5 * 60_000) {
          setReport(parsed.report);
          setState("ready");
          return () => {
            cancelled = true;
          };
        }
      }
    } catch {
      /* storage unavailable or malformed — fall back to the server read-back */
    }

    // 2. Fall back to the server read-back (direct URL, or no handoff present).
    (async () => {
      try {
        const res = await fetch(`/api/report/get?ticker=${encodeURIComponent(ticker)}`);
        const data = (await res.json()) as { found?: boolean; report?: CompanyReport };
        if (cancelled) return;
        if (data.found && data.report) {
          setReport(data.report);
          setState("ready");
        } else setState("missing");
      } catch {
        if (!cancelled) setState("missing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ticker]);
  return { report, state };
}

/**
 * Auto-open the print dialog once the view is genuinely ready — i.e. every
 * chart skeleton (`.gs-shimmer`) is gone AND the ECharts `<canvas>` count has
 * stopped changing (charts finished painting). This beats a blind timer: a
 * slow report never prints half-drawn, a fast one never waits the full delay.
 * A `maxWaitMs` fallback guarantees the dialog still opens if a signal stalls.
 */
export function useAutoPrint(state: LoadState, maxWaitMs = 9000) {
  useEffect(() => {
    if (state !== "ready") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const start = Date.now();
    let prevCanvas = -1;
    let stableTicks = 0;

    const fire = () => {
      // Double rAF so the final paint lands before the print snapshot.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!cancelled) window.print();
        }),
      );
    };

    const tick = () => {
      if (cancelled) return;
      const shimmers = document.querySelectorAll(".gs-shimmer").length;
      const canvases = document.querySelectorAll("canvas").length;
      const elapsed = Date.now() - start;

      stableTicks = canvases === prevCanvas ? stableTicks + 1 : 0;
      prevCanvas = canvases;

      const settled = shimmers === 0 && stableTicks >= 2 && elapsed > 600;
      if (settled || elapsed > maxWaitMs) {
        fire();
        return;
      }
      timer = setTimeout(tick, 250);
    };

    timer = setTimeout(tick, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state, maxWaitMs]);
}

/** Floating "Download PDF" control — hidden when printing. */
export function PrintToolbar({ label = "Download PDF" }: { label?: string }) {
  return (
    <div className="gs-no-print" style={{ position: "fixed", top: 12, right: 12, zIndex: 100 }}>
      <button
        onClick={() => window.print()}
        style={{ height: 34, padding: "0 16px", borderRadius: 8, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", boxShadow: "0 6px 20px rgba(79,70,229,0.3)" }}
      >
        ⤓ {label}
      </button>
    </div>
  );
}

/** Branded header band for a print page. */
export function BrandHeader({ report, subtitle }: { report: CompanyReport; subtitle?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#4f46e5", color: "#fff", borderRadius: 10, padding: "10px 16px", marginBottom: 12 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>
          {report.company} <span style={{ opacity: 0.8, fontWeight: 600, fontSize: 14 }}>· {report.ticker}</span>
        </div>
        <div style={{ fontSize: 11, opacity: 0.9 }}>
          glowstocks · source-backed equity research · {report.exchange} · {report.snapshot?.sector ?? ""} · as of {report.as_of}
          {subtitle ? ` · ${subtitle}` : ""}
        </div>
      </div>
      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <StancePill stance={report.snapshot?.stance ?? "Not available"} size="lg" />
        {report.is_sample && <span style={{ fontSize: 9, fontWeight: 700, background: "#fde68a", color: "#92400e", borderRadius: 4, padding: "1px 6px" }}>ILLUSTRATIVE SAMPLE</span>}
      </div>
    </div>
  );
}

export function BrandFooter({ report }: { report: CompanyReport }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#9ca3af", borderTop: "1px solid #e5e7eb", paddingTop: 5, marginTop: 10 }}>
      <span>glowstocks · {report.company} ({report.ticker}) · as of {report.as_of}</span>
      <span>source-backed · {report.sources.length} sources · {report.is_sample ? "illustrative sample" : "not investment advice"}</span>
    </div>
  );
}

/** Compact KPI tile for print. */
export function PrintKpi({ m }: { m: Metric }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 10px", background: "#fff" }}>
      <div style={{ fontSize: 9, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{citedText(m)}</div>
      {m.source && <div style={{ fontSize: 8, color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.source}</div>}
    </div>
  );
}

/** Section heading inside the full-report print. */
export function PrintSection({ title, children, breakBefore }: { title: string; children: React.ReactNode; breakBefore?: boolean }) {
  return (
    <section style={{ breakInside: "avoid", pageBreakInside: "avoid", breakBefore: breakBefore ? "page" : "auto", marginBottom: 14 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: "#4f46e5", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "2px solid #4f46e5", paddingBottom: 3, margin: "0 0 8px" }}>{title}</h2>
      {children}
    </section>
  );
}
