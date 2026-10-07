"use client";

import { useParams } from "next/navigation";
import type { CompanyReport, Cited, SourceRef } from "@/lib/types/report";
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
import { citedText, fmtCr, num } from "@/lib/format";

/**
 * Full multi-page report, print-optimized (A4 portrait). Cover page + every
 * section with its charts, tables and inline source citations, a running footer,
 * and clean page breaks. Real ECharts (animation off) render into the PDF.
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
  const f = r.financials;
  const history = f?.history ?? [];

  return (
    <div className="gs-print" style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', color: "#111827", maxWidth: "186mm", margin: "0 auto", padding: "4mm 0 18mm" }}>
      <style>{`@page { size: A4 portrait; margin: 12mm 12mm 16mm; } @media print { html, body { background:#fff; } }`}</style>
      <PrintToolbar label="Download full report PDF" />

      {/* Running footer (repeats on every printed page). */}
      <div className="gs-print-footer" style={{ position: "fixed", bottom: "4mm", left: 0, right: 0, display: "flex", justifyContent: "space-between", fontSize: 8.5, color: "#9ca3af", padding: "0 2mm" }}>
        <span>glowstocks · {r.company} ({r.ticker}) · as of {r.as_of}</span>
        <span>source-backed · {r.is_sample ? "illustrative sample" : "not investment advice"}</span>
      </div>

      {/* ---- Cover page ---- */}
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
          <b>Coverage:</b> {coverageLine(r)}<br />
          <b>Sources ({r.sources.length}):</b> {r.sources.slice(0, 12).map((s) => s.title).join(" · ")}
          {r.is_sample && <div style={{ marginTop: 8, color: "#b45309", fontWeight: 600 }}>⚠ Illustrative sample — figures are representative, not live. Not investment advice.</div>}
        </div>
      </section>

      {/* ---- Snapshot KPIs ---- */}
      <PrintSection title="Snapshot — headline KPIs">
        <MetricTable rows={(r.snapshot?.kpis ?? []).map((m) => ({ label: m.label, c: m }))} />
      </PrintSection>

      {/* ---- Business ---- */}
      <PrintSection title="Business & segments" breakBefore>
        <Two>
          <Chart title="Revenue mix by segment" has={r.business?.segments?.length}>
            <EChart option={segmentsDonutOption(r.business.segments)} height={200} animate={false} />
          </Chart>
          <Chart title="Revenue by geography" has={r.business?.geographies?.length}>
            <EChart option={geographyBarsOption(r.business.geographies)} height={200} animate={false} />
          </Chart>
        </Two>
        <CitedTable
          head={["Segment", "% revenue", "Trend", "Source"]}
          rows={(r.business?.segments ?? []).map((s) => [s.name, cell(s.pct_revenue), s.trend, srcOf(s.pct_revenue)])}
        />
      </PrintSection>

      {/* ---- Customers & Capacity ---- */}
      <PrintSection title="Customers & capacity" breakBefore>
        <Two>
          <Chart title="Customer mix" has={r.customers?.groups?.some((g) => g.concentration.available)}>
            <EChart option={customerMixDonutOption(r.customers?.groups ?? [])} height={190} animate={false} />
          </Chart>
          <Chart title="Order book / TCV (₹ cr)" has={orderRows(r).length}>
            <EChart option={valueBarsOption(orderRows(r), fmtCr)} height={190} animate={false} />
          </Chart>
        </Two>
        <CitedTable
          head={["Client group", "% revenue", "Risk", "Source"]}
          rows={(r.customers?.groups ?? []).map((g) => [g.segment, cell(g.concentration), g.risk ?? "—", srcOf(g.concentration)])}
        />
        <CitedTable
          head={["Footprint metric", "Value", "Source"]}
          rows={(r.capacity?.metrics ?? []).map((m) => [m.label, citedText(m), m.source ?? "—"])}
        />
        {(r.capacity?.sites ?? []).length > 0 && (
          <>
            <Caption>Sites & footprint detail</Caption>
            <CitedTable
              head={["Site", "Product", "Capacity", "Util.", "Capex", "Expansion", "Timeline", "Source"]}
              rows={(r.capacity?.sites ?? []).map((s) => [
                s.site,
                s.product ?? "—",
                cell(s.capacity ?? null),
                cell(s.utilization ?? null),
                cell(s.capex ?? null),
                s.expansion ?? "—",
                s.timeline ?? "—",
                srcOf(s.capacity ?? s.utilization ?? null),
              ])}
            />
          </>
        )}
      </PrintSection>

      {/* ---- Financials ---- */}
      <PrintSection title="Financials" breakBefore>
        <Two>
          <Chart title="Revenue · EBITDA · PAT (5Y, ₹ cr)" has={history.length}>
            <EChart option={financialsBarsOption(history)} height={200} animate={false} />
          </Chart>
          <Chart title="Margins (5Y, %)" has={history.length}>
            <EChart option={marginsLineOption(history)} height={200} animate={false} />
          </Chart>
        </Two>
        {f?.latest_quarter && (
          <MetricTable
            caption={`Latest quarter — ${f.latest_quarter.period}`}
            rows={[
              { label: "Revenue", c: f.latest_quarter.revenue },
              { label: "EBITDA margin", c: f.latest_quarter.ebitda_margin ?? null },
              { label: "PAT", c: f.latest_quarter.pat },
              { label: "PAT margin", c: f.latest_quarter.pat_margin ?? null },
              { label: "ROCE", c: f.latest_quarter.roce ?? null },
              { label: "ROE", c: f.latest_quarter.roe ?? null },
            ]}
          />
        )}
        {f?.latest_fy && (
          <MetricTable
            caption={`Latest FY — ${f.latest_fy.period}`}
            rows={[
              { label: "Revenue", c: f.latest_fy.revenue },
              { label: "EBITDA margin", c: f.latest_fy.ebitda_margin ?? null },
              { label: "PAT", c: f.latest_fy.pat },
              { label: "PAT margin", c: f.latest_fy.pat_margin ?? null },
              { label: "ROCE", c: f.latest_fy.roce ?? null },
              { label: "ROE", c: f.latest_fy.roe ?? null },
              { label: "Net debt", c: f.latest_fy.net_debt ?? null },
            ]}
          />
        )}
        <CitedTable
          head={["Year", "Revenue", "EBITDA %", "PAT", "PAT %", "EPS", "Source"]}
          rows={history.map((y) => [y.period, cell(y.revenue), cell(y.ebitda_margin ?? null), cell(y.pat), cell(y.pat_margin ?? null), cell(y.eps ?? null), srcOf(y.revenue)])}
        />
      </PrintSection>

      {/* ---- Growth & Concall ---- */}
      <PrintSection title="Growth & concall" breakBefore>
        <CitedTable
          head={["Driver", "Direction", "Detail", "Source"]}
          rows={(r.growth?.drivers ?? []).map((d) => [d.name, d.direction, d.detail, srcOf(d.metric ?? null)])}
        />
        {(r.growth?.catalysts ?? []).length > 0 && (
          <>
            <Caption>Catalyst watchlist</Caption>
            <CitedTable
              head={["Catalyst", "Timing", "KPI", "Confirms", "Falsifies"]}
              rows={(r.growth?.catalysts ?? []).map((c) => [c.catalyst, c.timing, c.kpi, c.confirms ?? "—", c.falsifies ?? "—"])}
            />
          </>
        )}
        {(r.growth?.downside_triggers ?? []).length > 0 && (
          <>
            <Caption>Downside triggers</Caption>
            <ul style={{ ...ulS, color: "#b42318" }}>
              {(r.growth?.downside_triggers ?? []).map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </>
        )}
        {r.concall?.available && (
          <div style={{ marginTop: 8 }}>
            <Caption>Concall highlights — {r.concall.period}</Caption>
            {r.concall.highlights.map((h, i) => (
              <div key={i} style={{ fontSize: 10.5, marginBottom: 4, borderLeft: "2px solid #4f46e5", paddingLeft: 8 }}>
                <b>{h.theme}:</b> <i>“{h.quote}”</i> — {h.speaker} <span style={{ color: "#9ca3af" }}>({h.source})</span>
              </div>
            ))}
            {(r.concall.insights ?? []).length > 0 && (
              <>
                <Caption>So-what insights</Caption>
                <ul style={ulS}>{r.concall.insights.map((ins, i) => <li key={i}>{ins}</li>)}</ul>
              </>
            )}
            {r.concall.tone && (
              <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}><b>Management tone:</b> {r.concall.tone}</div>
            )}
          </div>
        )}
      </PrintSection>

      {/* ---- Peers & Estimates ---- */}
      <PrintSection title="Peers & estimates" breakBefore>
        <CitedTable
          head={["Company", "P/E", "EV/EBITDA", "ROE", "ROCE", "Sales 5Y", "D/E", "Source(s)"]}
          rows={(r.peers?.peers ?? []).map((p) => [
            `${p.name}${p.is_self ? " ★" : ""}`, cell(p.pe), cell(p.ev_ebitda), cell(p.roe), cell(p.roce), cell(p.sales_growth_5y), cell(p.de), srcsOf(p.pe, p.ev_ebitda, p.roe, p.roce, p.sales_growth_5y, p.de),
          ])}
        />
        {r.estimates?.available && (
          <>
            <Two>
              <Chart title="Forward revenue (₹ cr)" has={r.estimates.forward.some((e) => e.revenue?.available)}>
                <EChart option={forwardRevenueBarsOption(r.estimates.forward)} height={180} animate={false} />
              </Chart>
              <Chart title="Forward EPS (₹)" has={r.estimates.forward.some((e) => e.eps?.available)}>
                <EChart option={forwardEpsLineOption(r.estimates.forward)} height={180} animate={false} />
              </Chart>
            </Two>
            <CitedTable
              head={["Period", "Revenue (₹ cr)", "EPS (₹)", "Growth", "Source(s)"]}
              rows={(r.estimates.forward ?? []).map((e) => [e.period, cell(e.revenue ?? null), cell(e.eps ?? null), cell(e.growth ?? null), srcsOf(e.revenue, e.eps, e.growth)])}
            />
            <MetricTable
              caption="Street targets & consensus"
              rows={[
                { label: "Target — low", c: r.estimates.target_low ?? null },
                { label: "Target — mean", c: r.estimates.target_mean ?? null },
                { label: "Target — high", c: r.estimates.target_high ?? null },
                { label: "Consensus rating", c: r.estimates.rating ?? null },
                { label: "Analysts covering", c: r.estimates.analysts ?? null },
              ]}
            />
            {r.estimates.eps_revision && (
              <p style={{ fontSize: 10, color: "#374151", margin: "4px 0 0" }}><b>EPS revisions:</b> {r.estimates.eps_revision}</p>
            )}
          </>
        )}
      </PrintSection>

      {/* ---- Thesis & Risks ---- */}
      <PrintSection title="Thesis & risks" breakBefore>
        <Two>
          <div>
            <Caption>Bull case</Caption>
            <ul style={ulS}>{(r.thesis?.supports ?? []).map((p, i) => <li key={i}>{p.text}</li>)}</ul>
          </div>
          <div>
            <Caption>Bear case</Caption>
            <ul style={ulS}>{(r.thesis?.counters ?? []).map((p, i) => <li key={i}>{p.text}</li>)}</ul>
          </div>
        </Two>
        <Chart title="Scenario upside to target (%)" has={(r.thesis?.scenarios ?? []).some((s) => num(s.upside) !== null)}>
          <EChart option={scenarioUpsideOption((r.thesis?.scenarios ?? []).map((s) => ({ name: s.name, upside: num(s.upside) })))} height={170} animate={false} />
        </Chart>
        <CitedTable
          head={["Risk", "Severity", "Probability", "Mitigants"]}
          rows={(r.risks?.register ?? []).map((row) => [row.risk, row.severity, row.probability, row.mitigants ?? "—"])}
        />
        {r.mna?.found && r.mna.deals.length > 0 && (
          <CitedTable
            head={["Date", "Target", "What", "Status", "Source"]}
            rows={r.mna.deals.map((d) => [d.date ?? "—", d.target, d.what, d.status ?? "—", d.source ?? "—"])}
          />
        )}
      </PrintSection>

      {/* ---- Sources & Integrity ---- */}
      <PrintSection title="Sources & integrity" breakBefore>
        <CitedTable
          head={["Check", "Status", "Detail"]}
          rows={(r.integrity?.checks ?? []).map((c) => [c.check, c.status.toUpperCase(), c.detail ?? "—"])}
        />
        <Caption>Sources — the provenance spine</Caption>
        <SourcesTable sources={r.sources} />
      </PrintSection>
    </div>
  );
}

/* ---- small print components ---- */

const ulS: React.CSSProperties = { margin: "2px 0", paddingLeft: 16, fontSize: 10.5, lineHeight: 1.5, color: "#374151" };

function coverageLine(r: CompanyReport): string {
  const keys = ["snapshot", "business", "financials", "peers", "thesis", "customers", "capacity", "growth", "concall", "mna", "estimates", "risks", "integrity"] as const;
  return keys.filter((k) => r.coverage[k]).join(" · ");
}
function orderRows(r: CompanyReport): { label: string; value: number }[] {
  return (r.customers?.order_book ?? [])
    .map((o) => ({ label: o.metric, value: num(o.value) }))
    .filter((x): x is { label: string; value: number } => x.value !== null);
}
const cell = (c: Cited<number> | null | undefined): string => citedText(c);
const srcOf = (c: Cited<number> | null | undefined): string => (c?.available ? c.source ?? "—" : "—");
/** Unique sources across several independently cited values, so a row isn't
 *  attributed to just one metric's source. */
const srcsOf = (...cs: (Cited<number> | null | undefined)[]): string => {
  const seen: string[] = [];
  for (const c of cs) if (c?.available && c.source && !seen.includes(c.source)) seen.push(c.source);
  return seen.join(" · ") || "—";
};

function Caption({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: "#374151", margin: "8px 0 3px" }}>{children}</div>;
}
function Two({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>{children}</div>;
}
function Chart({ title, has, children }: { title: string; has: number | boolean | undefined; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "5px 7px", breakInside: "avoid" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#374151", marginBottom: 2 }}>{title}</div>
      {has ? children : <div style={{ fontSize: 10, color: "#9ca3af", fontStyle: "italic", padding: "16px 2px" }}>Not available</div>}
    </div>
  );
}

function MetricTable({ rows, caption }: { rows: { label: string; c: Cited<number | string> | null | undefined }[]; caption?: string }) {
  return (
    <>
      {caption && <Caption>{caption}</Caption>}
      <table style={tblS}>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 ? "#f9fafb" : undefined }}>
              <td style={{ ...tdS, color: "#6b7280" }}>{row.label}</td>
              <td style={{ ...tdS, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{citedText(row.c)}</td>
              <td style={{ ...tdS, color: "#9ca3af", fontSize: 8.5 }}>{row.c?.available ? [row.c.source, row.c.locator].filter(Boolean).join(" · ") : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function CitedTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  if (!rows.length) return <div style={{ fontSize: 10, color: "#9ca3af", fontStyle: "italic", padding: "6px 0" }}>Not available</div>;
  return (
    <table style={{ ...tblS, marginTop: 6 }}>
      <thead>
        <tr style={{ background: "#eef2ff", color: "#3730a3" }}>
          {head.map((h, i) => <th key={i} style={{ ...tdS, textAlign: i === 0 ? "left" : "left", fontWeight: 700 }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 ? "#f9fafb" : undefined }}>
            {row.map((v, j) => <td key={j} style={{ ...tdS, fontVariantNumeric: j > 0 ? "tabular-nums" : undefined }}>{v}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SourcesTable({ sources }: { sources: SourceRef[] }) {
  return (
    <table style={tblS}>
      <thead>
        <tr style={{ background: "#eef2ff", color: "#3730a3" }}>
          {["#", "Title", "Type", "Date", "Locator", "URL"].map((h) => <th key={h} style={{ ...tdS, textAlign: "left", fontWeight: 700 }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {sources.map((s, i) => (
          <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 ? "#f9fafb" : undefined }}>
            <td style={tdS}>{s.id}</td>
            <td style={tdS}>{s.title}</td>
            <td style={tdS}>{s.type}</td>
            <td style={tdS}>{s.date ?? "—"}</td>
            <td style={tdS}>{s.locator ?? "—"}</td>
            <td style={{ ...tdS, maxWidth: 150 }}>
              {s.url ? <a href={s.url} style={{ color: "#4f46e5", wordBreak: "break-all" }}>{s.url}</a> : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const tblS: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 10 };
const tdS: React.CSSProperties = { padding: "3px 6px", textAlign: "left", verticalAlign: "top" };
