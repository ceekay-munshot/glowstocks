"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import type { EChartsOption } from "echarts";
import type { CompanyReport } from "@/lib/types/report";
import { EChart } from "@/components/charts/EChart";
import { StancePill } from "@/components/Stance";
import {
  PrintKpi,
  PrintSection,
  PrintToolbar,
  useAutoPrint,
  usePrintReport,
} from "@/components/print/PrintKit";
import {
  customerMixDonutOption,
  financialsBarsOption,
  forwardEpsLineOption,
  forwardRevenueBarsOption,
  geographyBarsOption,
  marginsLineOption,
  scenarioUpsideOption,
  segmentsDonutOption,
  valueBarsOption,
} from "@/lib/charts";
import { fmtCr, num } from "@/lib/format";
import {
  buildReportModel,
  type Cell,
  type ChartId,
  type Part,
  type SectionModel,
} from "@/lib/export/reportModel";

/**
 * Full multi-page report, print-optimized (A4 portrait). A branded cover page,
 * then EVERY section rendered from the shared report model (so it can never drop
 * populated data), each with its charts, tables and inline citations, a running
 * footer and clean page breaks. Real ECharts (animation off) render into the PDF.
 */
export default function FullReport() {
  const params = useParams<{ ticker: string }>();
  const ticker = decodeURIComponent(params.ticker);
  const { report, state } = usePrintReport(ticker);
  useAutoPrint(state, 12000);

  if (state !== "ready" || !report) {
    return (
      <div style={{ padding: 40, fontFamily: "system-ui", color: "#374151" }}>
        {state === "missing" ? `No report found for ${ticker}.` : "Preparing full report…"}
      </div>
    );
  }

  const r = report;
  const model = buildReportModel(r);

  return (
    <div className="gs-print" style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', color: "#111827", maxWidth: "186mm", margin: "0 auto", padding: "4mm 0 18mm" }}>
      <style>{`@page { size: A4 portrait; margin: 12mm 12mm 16mm; } @media print { html, body { background:#fff; } }`}</style>
      <PrintToolbar label="Download full report PDF" />

      {/* Running footer (repeats on every printed page). */}
      <div className="gs-print-footer" style={{ position: "fixed", bottom: "4mm", left: 0, right: 0, display: "flex", justifyContent: "space-between", fontSize: 8.5, color: "#9ca3af", padding: "0 2mm" }}>
        <span>glowstocks · {r.company} ({r.ticker}) · as of {r.as_of}</span>
        <span>source-backed · {r.is_sample ? "illustrative sample" : "not investment advice"}</span>
      </div>

      <Cover r={r} />

      {model.map((sec) => (
        <PrintSection key={sec.key} title={sec.title} breakBefore={sec.key !== "snapshot"}>
          <SectionCharts section={sec} r={r} />
          {sec.parts.map((part, i) => <PartView key={i} part={part} />)}
        </PrintSection>
      ))}
    </div>
  );
}

/* ---- cover page (bespoke summary) ---- */

function Cover({ r }: { r: CompanyReport }) {
  return (
    <section style={{ breakAfter: "page", pageBreakAfter: "always", minHeight: "250mm", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#4f46e5", color: "#fff", borderRadius: 12, padding: "22px 20px", marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85, letterSpacing: "0.04em" }}>GLOWSTOCKS · SOURCE-BACKED EQUITY RESEARCH</div>
        <div style={{ fontSize: 30, fontWeight: 800, marginTop: 10, lineHeight: 1.1 }}>{r.company}</div>
        <div style={{ fontSize: 15, opacity: 0.9, marginTop: 4 }}>{r.ticker} · {r.exchange} · {r.snapshot?.sector ?? ""} · {r.snapshot?.industry ?? ""}</div>
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 10 }}>As of {r.as_of} · generated {r.last_updated.slice(0, 10)}</div>
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
        <StancePill stance={r.snapshot?.stance ?? "Not available"} size="lg" />
        <span style={{ fontSize: 13, color: "#374151", fontStyle: "italic" }}>{r.snapshot?.stance_rationale ?? ""}</span>
      </div>
      {r.snapshot?.business_model && <p style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.6, margin: "0 0 18px" }}>{r.snapshot.business_model}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
        {(r.snapshot?.kpis ?? []).slice(0, 9).map((m, i) => <PrintKpi key={i} m={m} />)}
      </div>
      <div style={{ marginTop: "auto", fontSize: 10, color: "#6b7280", borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>
        <b>Sources ({r.sources.length}):</b> {r.sources.slice(0, 12).map((s) => s.title).join(" · ")}
        {r.is_sample && <div style={{ marginTop: 8, color: "#b45309", fontWeight: 600 }}>⚠ Illustrative sample — figures are representative, not live. Not investment advice.</div>}
      </div>
    </section>
  );
}

/* ---- charts (rendered from raw data; model only says which + whether they have data) ---- */

function chartOption(id: ChartId, r: CompanyReport): EChartsOption | null {
  switch (id) {
    case "segments": return segmentsDonutOption(r.business?.segments ?? []);
    case "geography": return geographyBarsOption(r.business?.geographies ?? []);
    case "customerMix": return customerMixDonutOption(r.customers?.groups ?? []);
    case "orderBook": {
      // Only plot ₹-crore metrics — ratios (book-to-bill x, months of coverage)
      // must not be rendered on a ₹-crore axis.
      const rows = (r.customers?.order_book ?? [])
        .filter((o) => o.value?.available && o.value.unit === "INR cr" && typeof o.value.value === "number")
        .map((o) => ({ label: o.metric, value: o.value.value as number }));
      return rows.length ? valueBarsOption(rows, fmtCr) : null;
    }
    case "financialsBars": return financialsBarsOption(r.financials?.history ?? []);
    case "margins": return marginsLineOption(r.financials?.history ?? []);
    case "forwardRevenue": return forwardRevenueBarsOption(r.estimates?.forward ?? []);
    case "forwardEps": return forwardEpsLineOption(r.estimates?.forward ?? []);
    case "scenarioUpside": return scenarioUpsideOption((r.thesis?.scenarios ?? []).map((s) => ({ name: s.name, upside: num(s.upside ?? null) })));
    default: return null;
  }
}

function SectionCharts({ section, r }: { section: SectionModel; r: CompanyReport }) {
  if (!section.charts.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: section.charts.length === 1 ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 8 }}>
      {section.charts.map((ch) => {
        const opt = ch.has ? chartOption(ch.id, r) : null;
        return (
          <div key={ch.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "5px 7px", breakInside: "avoid" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#374151", marginBottom: 2 }}>{ch.title}</div>
            {opt ? <EChart option={opt} height={190} animate={false} /> : <div style={{ fontSize: 10, color: "#9ca3af", fontStyle: "italic", padding: "16px 2px" }}>Not available</div>}
          </div>
        );
      })}
    </div>
  );
}

/* ---- generic part renderers (drive every table/list/kv from the model) ---- */

function renderCell(cell: Cell): ReactNode {
  if (cell.url) return <a href={cell.url} style={{ color: "#4f46e5", wordBreak: "break-all" }}>{cell.text}</a>;
  return <span style={{ color: cell.muted ? "#9ca3af" : "#111827", fontStyle: cell.muted ? "italic" : undefined }}>{cell.text}</span>;
}

function PartView({ part }: { part: Part }) {
  if (part.kind === "prose") {
    return (
      <>
        {part.title && <Caption>{part.title}</Caption>}
        <p style={{ fontSize: 10.5, lineHeight: 1.5, color: "#374151", margin: "2px 0 6px" }}>{part.text}</p>
      </>
    );
  }
  if (part.kind === "note") {
    return <div style={{ fontSize: 10.5, color: part.tone === "warn" ? "#b45309" : "#6b7280", fontStyle: "italic", background: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: 6, padding: "6px 8px", margin: "4px 0" }}>{part.text}</div>;
  }
  if (part.kind === "list") {
    const color = part.tone === "danger" ? "#b42318" : part.tone === "good" ? "#067647" : "#374151";
    return (
      <>
        {part.title && <Caption>{part.title}</Caption>}
        <ul style={{ margin: "2px 0 6px", paddingLeft: 16, fontSize: 10.5, lineHeight: 1.5, color }}>
          {part.items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      </>
    );
  }
  if (part.kind === "kv") {
    return (
      <>
        {part.title && <Caption>{part.title}</Caption>}
        <table style={tblS}>
          <tbody>
            {part.rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 ? "#f9fafb" : undefined }}>
                <td style={{ ...tdS, color: "#6b7280", width: "34%" }}>{row.label}</td>
                <td style={{ ...tdS, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{renderCell(row.cell)}</td>
                <td style={{ ...tdS, color: "#9ca3af", fontSize: 8.5 }}>{row.cell.sources.join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }
  // table
  if (!part.rows.length) {
    return (
      <>
        {part.title && <Caption>{part.title}</Caption>}
        <div style={{ fontSize: 10, color: "#9ca3af", fontStyle: "italic", padding: "6px 0" }}>Not available</div>
      </>
    );
  }
  return (
    <>
      {part.title && <Caption>{part.title}</Caption>}
      <table style={{ ...tblS, marginTop: 4 }}>
        <thead>
          <tr style={{ background: "#eef2ff", color: "#3730a3" }}>
            {part.columns.map((h, i) => <th key={i} style={{ ...tdS, textAlign: "left", fontWeight: 700 }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {part.rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 ? "#f9fafb" : undefined }}>
              {row.map((cell, j) => (
                <td key={j} style={{ ...tdS, textAlign: cell.align === "right" ? "right" : "left", fontVariantNumeric: cell.align === "right" ? "tabular-nums" : undefined }}>{renderCell(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Caption({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: "#374151", margin: "8px 0 3px" }}>{children}</div>;
}

const tblS: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 10 };
const tdS: React.CSSProperties = { padding: "3px 6px", textAlign: "left", verticalAlign: "top" };
