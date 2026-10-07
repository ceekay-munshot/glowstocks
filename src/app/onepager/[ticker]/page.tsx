"use client";

import { useParams } from "next/navigation";
import type { CompanyReport } from "@/lib/types/report";
import { EChart } from "@/components/charts/EChart";
import {
  BrandFooter,
  BrandHeader,
  PrintKpi,
  PrintToolbar,
  useAutoPrint,
  usePrintReport,
} from "@/components/print/PrintKit";
import {
  financialsBarsOption,
  marginsLineOption,
  scenarioUpsideOption,
  segmentsDonutOption,
} from "@/lib/charts";
import { citedText, num } from "@/lib/format";

/**
 * Premium one-pager: a single LANDSCAPE page, pure-visual, with REAL ECharts
 * (animation off so they're drawn before the PDF is captured). Opened from the
 * Export menu; auto-triggers the browser print dialog → "Save as PDF".
 */
export default function OnePager() {
  const params = useParams<{ ticker: string }>();
  const ticker = decodeURIComponent(params.ticker);
  const { report, state } = usePrintReport(ticker);
  useAutoPrint(state);

  if (state !== "ready" || !report) {
    return (
      <div style={{ padding: 40, fontFamily: "system-ui", color: "#374151" }}>
        {state === "missing" ? `No report found for ${ticker}.` : "Preparing one-pager…"}
      </div>
    );
  }

  const r = report;
  const history = r.financials?.history ?? [];
  const segments = r.business?.segments ?? [];
  const scenarios = (r.thesis?.scenarios ?? []).map((s) => ({ name: s.name, upside: num(s.upside) }));
  const peers = (r.peers?.peers ?? []).slice(0, 6);

  const CARD: React.CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", padding: "6px 8px", display: "flex", flexDirection: "column", minWidth: 0 };
  const CAP: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "#374151", margin: "0 0 2px" };

  return (
    <div className="gs-print" style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', color: "#111827", padding: 0, maxWidth: "281mm", margin: "0 auto" }}>
      <style>{`@page { size: A4 landscape; margin: 8mm; } @media print { html, body { background: #fff; } }`}</style>
      <PrintToolbar label="Download one-pager PDF" />

      <BrandHeader report={r} subtitle="one-pager" />

      {/* Business model one-liner */}
      {r.snapshot?.business_model && (
        <p style={{ fontSize: 11, color: "#374151", lineHeight: 1.4, margin: "0 0 8px" }}>{r.snapshot.business_model}</p>
      )}

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 7, marginBottom: 8 }}>
        {(r.snapshot?.kpis ?? []).slice(0, 6).map((m, i) => <PrintKpi key={i} m={m} />)}
      </div>

      {/* Charts row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.2fr 1fr", gap: 8, marginBottom: 8 }}>
        <div style={CARD}>
          <div style={CAP}>Revenue mix by segment</div>
          {segments.length ? <EChart option={segmentsDonutOption(segments)} height={168} animate={false} /> : <Na />}
        </div>
        <div style={CARD}>
          <div style={CAP}>Revenue · EBITDA · PAT (5Y, ₹ cr)</div>
          {history.length ? <EChart option={financialsBarsOption(history)} height={168} animate={false} /> : <Na />}
        </div>
        <div style={CARD}>
          <div style={CAP}>Scenario upside to target</div>
          {scenarios.some((s) => s.upside !== null) ? <EChart option={scenarioUpsideOption(scenarios)} height={168} animate={false} /> : <Na />}
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 8 }}>
        <div style={CARD}>
          <div style={CAP}>Margins (5Y, %)</div>
          {history.length ? <EChart option={marginsLineOption(history)} height={158} animate={false} /> : <Na />}
        </div>
        <div style={CARD}>
          <div style={CAP}>Peer snapshot</div>
          <PeerSnapshot peers={peers} />
        </div>
      </div>

      <BrandFooter report={r} />
    </div>
  );
}

function Na() {
  return <div style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic", padding: "24px 4px" }}>Not available</div>;
}

function PeerSnapshot({ peers }: { peers: CompanyReport["peers"]["peers"] }) {
  if (!peers.length) return <Na />;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
      <thead>
        <tr style={{ color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
          <th style={{ textAlign: "left", padding: "2px 4px" }}>Company</th>
          <th style={{ textAlign: "right", padding: "2px 4px" }}>P/E</th>
          <th style={{ textAlign: "right", padding: "2px 4px" }}>ROE</th>
          <th style={{ textAlign: "right", padding: "2px 4px" }}>ROCE</th>
        </tr>
      </thead>
      <tbody>
        {peers.map((p) => (
          <tr key={p.name} style={{ borderBottom: "1px solid #f3f4f6", background: p.is_self ? "#eef2ff" : undefined, fontWeight: p.is_self ? 700 : 400 }}>
            <td style={{ padding: "2px 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>{p.name}</td>
            <td style={{ textAlign: "right", padding: "2px 4px", fontVariantNumeric: "tabular-nums" }}>{citedText(p.pe)}</td>
            <td style={{ textAlign: "right", padding: "2px 4px", fontVariantNumeric: "tabular-nums" }}>{citedText(p.roe)}</td>
            <td style={{ textAlign: "right", padding: "2px 4px", fontVariantNumeric: "tabular-nums" }}>{citedText(p.roce)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
