"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { CompanyReport } from "@/lib/types/report";
import { StancePill } from "@/components/Stance";
import { citedText, num, fmtCr } from "@/lib/format";
import { STANCE_COLOR } from "@/lib/palette";

/**
 * Bespoke one-pager export: a print-optimized, visual Snapshot page. Pure HTML
 * (no canvas) so it prints reliably. The Export ▸ One-pager button opens this in
 * a new tab; it auto-triggers the browser's Print dialog → "Save as PDF".
 */
export default function OnePager() {
  const params = useParams<{ ticker: string }>();
  const ticker = decodeURIComponent(params.ticker);
  const [report, setReport] = useState<CompanyReport | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/report/get?ticker=${encodeURIComponent(ticker)}`);
        const data = (await res.json()) as { found?: boolean; report?: CompanyReport };
        if (cancelled) return;
        if (data.found && data.report) {
          setReport(data.report);
          setState("ready");
        } else {
          setState("missing");
        }
      } catch {
        if (!cancelled) setState("missing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  useEffect(() => {
    if (state === "ready") {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [state]);

  if (state !== "ready" || !report) {
    return (
      <div style={{ padding: 40, fontFamily: "system-ui", color: "#374151" }}>
        {state === "missing" ? `No report found for ${ticker}.` : "Preparing one-pager…"}
      </div>
    );
  }

  const r = report;
  const fy = r.financials?.latest_fy;
  const topSegments = (r.business?.segments ?? []).slice(0, 6);

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 28, fontFamily: "system-ui, -apple-system, sans-serif", color: "#111827" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #111827", paddingBottom: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            {r.company} <span style={{ color: "#6b7280", fontWeight: 600, fontSize: 16 }}>· {r.ticker}</span>
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            {r.exchange} · {r.snapshot?.sector ?? "—"} · as of {r.as_of}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <StancePill stance={r.snapshot?.stance ?? "Not available"} size="lg" />
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>glowstocks one-pager</div>
        </div>
      </div>

      {r.snapshot?.business_model && (
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#374151", margin: "0 0 16px" }}>{r.snapshot.business_model}</p>
      )}

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
        {(r.snapshot?.kpis ?? []).slice(0, 9).map((m, i) => (
          <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 10, color: "#6b7280" }}>{m.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{citedText(m)}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {/* Financials */}
        <div>
          <SectionTitle>Financials — {fy?.period ?? "latest FY"}</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <tbody>
              <Row label="Revenue" value={fy ? citedText(fy.revenue) : "—"} />
              <Row label="EBITDA margin" value={fy ? citedText(fy.ebitda_margin ?? null) : "—"} />
              <Row label="PAT" value={fy ? citedText(fy.pat) : "—"} />
              <Row label="PAT margin" value={fy ? citedText(fy.pat_margin ?? null) : "—"} />
              <Row label="ROCE" value={fy ? citedText(fy.roce ?? null) : "—"} />
              <Row label="ROE" value={fy ? citedText(fy.roe ?? null) : "—"} />
              <Row label="Net debt" value={fy && num(fy.net_debt ?? null) !== null ? fmtCr(num(fy.net_debt ?? null) as number) : "—"} />
            </tbody>
          </table>
        </div>

        {/* Segments */}
        <div>
          <SectionTitle>Revenue mix</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <tbody>
              {topSegments.map((s) => (
                <Row key={s.name} label={s.name} value={citedText(s.pct_revenue)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Thesis */}
      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div>
          <SectionTitle>Bull case</SectionTitle>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#374151", lineHeight: 1.5 }}>
            {(r.thesis?.supports ?? []).slice(0, 4).map((p, i) => <li key={i}>{p.text}</li>)}
          </ul>
        </div>
        <div>
          <SectionTitle>Bear case</SectionTitle>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#374151", lineHeight: 1.5 }}>
            {(r.thesis?.counters ?? []).slice(0, 4).map((p, i) => <li key={i}>{p.text}</li>)}
          </ul>
        </div>
      </div>

      <div style={{ marginTop: 20, borderTop: "1px solid #e5e7eb", paddingTop: 8, fontSize: 10, color: "#9ca3af" }}>
        {r.sources.length} sources · updated {r.last_updated.slice(0, 10)} · {r.is_sample ? "ILLUSTRATIVE SAMPLE" : "source-backed"} · Not investment advice.
        <button className="gs-no-print" onClick={() => window.print()} style={{ marginLeft: 12, border: "1px solid #e5e7eb", borderRadius: 6, padding: "2px 10px", cursor: "pointer", background: "#fff" }}>
          Print / Save as PDF
        </button>
      </div>
      <div style={{ marginTop: 6, fontSize: 10, color: STANCE_COLOR[r.snapshot?.stance ?? "Not available"] }}>
        Stance: {r.snapshot?.stance}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#4f46e5", marginBottom: 6 }}>{children}</div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
      <td style={{ padding: "5px 0", color: "#6b7280" }}>{label}</td>
      <td style={{ padding: "5px 0", textAlign: "right", fontWeight: 600 }}>{value}</td>
    </tr>
  );
}
