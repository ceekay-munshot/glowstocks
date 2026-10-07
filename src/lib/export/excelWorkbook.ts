// Bespoke premium workbook for glowstocks — designed from scratch for this
// product (not copied). One branded Cover sheet + nine tab-organized sheets, all
// polished: frozen coloured header bands, zebra striping, gridlines, auto-fit
// widths, ₹cr / % / x / date number formats, conditional colour (green/red) and
// in-cell data bars. EVERY data row keeps its source; "Not available" → "n/a",
// never 0 or blank.

import ExcelJS from "exceljs";
import type {
  Cited,
  CompanyReport,
  Peer,
  PeriodFinancials,
} from "@/lib/types/report";

const NA = "n/a";

// Brand + status palette (hex → ARGB).
const INDIGO = "FF4F46E5";
const INDIGO_DK = "FF3730A3";
const INK = "FF111827";
const MUTED = "FF6B7280";
const ZEBRA = "FFF7F8FB";
const GREEN = "FF067647";
const RED = "FFB42318";
const AMBER = "FFB54708";
const STANCE_FILL: Record<string, string> = { BUY: "FF0CA30C", HOLD: "FFEAA50B", SELL: "FFD03B3B" };
const SEQ_BAR = "FF9EC5F4"; // sequential blue data-bar

const FMT = { cr: "#,##0;[Red]-#,##0", pct: '0.0"%"', mult: '0.0"x"', price: "₹#,##0", int: "#,##0" };

type AnyCited = Cited<number | string> | null | undefined;
const val = (c: AnyCited): number | string => (!c || !c.available || c.value === null || c.value === undefined ? NA : c.value);
const src = (c: AnyCited): string => (!c || !c.available ? "" : c.source ?? "");
const dt = (c: AnyCited): string => (!c || !c.available ? "" : c.date ?? "");
const loc = (c: AnyCited): string => (!c || !c.available ? "" : c.locator ?? "");

/** Unique, order-preserving source list across several independently cited
 *  values — so a row whose columns come from different sources is not
 *  attributed to just one of them. */
function joinSources(...cols: AnyCited[]): string {
  const seen: string[] = [];
  for (const c of cols) {
    const s = src(c);
    if (s && !seen.includes(s)) seen.push(s);
  }
  return seen.join(" · ");
}

/** Unique source list across every cited metric a peer row carries. */
function peerSources(p: Peer): string {
  return joinSources(p.price, p.mcap, p.pe, p.ev_ebitda, p.roe, p.roce, p.roa, p.sales_growth_5y, p.profit_growth_5y, p.de);
}

interface H {
  wb: ExcelJS.Workbook;
}

// Row number of each sheet's FIRST coloured header band, so buildWorkbook can
// freeze the panes at the actual table header (sheets open with a title row, so
// a blanket ySplit:1 would freeze the title instead of the header).
const firstHeaderRow = new WeakMap<ExcelJS.Worksheet, number>();

/** Style a header row: coloured band, white bold, thin bottom border, frozen. */
function headerRow(ws: ExcelJS.Worksheet, values: (string | number)[], fill = INDIGO): ExcelJS.Row {
  const row = ws.addRow(values);
  if (!firstHeaderRow.has(ws)) firstHeaderRow.set(ws, row.number);
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: "FFCBD5E1" } } };
  });
  row.height = 20;
  return row;
}

/** Zebra-stripe data rows [from, to] (inclusive, 1-indexed). */
function zebra(ws: ExcelJS.Worksheet, from: number, to: number, cols: number) {
  for (let r = from; r <= to; r++) {
    if ((r - from) % 2 === 1) {
      for (let c = 1; c <= cols; c++) {
        const cell = ws.getRow(r).getCell(c);
        if (!cell.fill || cell.fill.type !== "pattern") cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
      }
    }
  }
}

/** A section-title band (merged, indigo-soft) above a block. */
function title(ws: ExcelJS.Worksheet, text: string) {
  const row = ws.addRow([text]);
  row.getCell(1).font = { bold: true, size: 12, color: { argb: INDIGO_DK } };
  row.height = 18;
  return row;
}

/** Auto-fit every column from its content (bounded). */
function autofit(ws: ExcelJS.Worksheet, min = 10, max = 64) {
  const n = ws.columnCount;
  for (let i = 1; i <= n; i++) {
    let w = min;
    ws.getColumn(i).eachCell({ includeEmpty: false }, (cell) => {
      const v = cell.value;
      const str = v == null ? "" : typeof v === "object" ? "" : String(v);
      if (str.length + 2 > w) w = str.length + 2;
    });
    ws.getColumn(i).width = Math.min(max, Math.max(min, w));
  }
}

function dataBar(ws: ExcelJS.Worksheet, ref: string) {
  ws.addConditionalFormatting({
    ref,
    rules: [
      { type: "dataBar", priority: 1, cfvo: [{ type: "min" }, { type: "max" }], color: { argb: SEQ_BAR } } as unknown as ExcelJS.ConditionalFormattingRule,
    ],
  });
}

/* ------------------------------------------------------------------- cover */

function coverSheet({ wb }: H, r: CompanyReport) {
  const ws = wb.addWorksheet("Cover", { properties: { defaultColWidth: 16 } });
  ws.columns = [{ width: 22 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 22 }, { width: 22 }];

  // Branded band.
  ws.mergeCells("A1:F2");
  const band = ws.getCell("A1");
  band.value = "glowstocks  ·  source-backed equity research";
  band.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INDIGO } };
  band.font = { bold: true, size: 20, color: { argb: "FFFFFFFF" } };
  band.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(1).height = 26;
  ws.getRow(2).height = 20;

  ws.addRow([]);
  ws.mergeCells("A4:F4");
  const nameCell = ws.getCell("A4");
  nameCell.value = `${r.company}  (${r.ticker})`;
  nameCell.font = { bold: true, size: 16, color: { argb: INK } };
  ws.mergeCells("A5:F5");
  ws.getCell("A5").value = `${r.exchange}  ·  ${r.snapshot?.sector ?? ""}  ·  as of ${r.as_of}`;
  ws.getCell("A5").font = { color: { argb: MUTED }, size: 11 };

  // Stance badge.
  ws.addRow([]);
  const stance = r.snapshot?.stance ?? "Not available";
  ws.mergeCells("A7:B8");
  const badge = ws.getCell("A7");
  badge.value = stance;
  badge.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STANCE_FILL[stance] ?? "FF898781" } };
  badge.font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
  badge.alignment = { vertical: "middle", horizontal: "center" };
  ws.getRow(7).height = 22;
  ws.mergeCells("C7:F8");
  ws.getCell("C7").value = r.snapshot?.stance_rationale ?? "";
  ws.getCell("C7").font = { italic: true, color: { argb: INK }, size: 11 };
  ws.getCell("C7").alignment = { vertical: "middle", wrapText: true };

  // Headline KPIs.
  ws.addRow([]);
  title(ws, "Headline KPIs");
  const kh = headerRow(ws, ["Metric", "Value", "Unit", "Source"]);
  const kStart = kh.number + 1;
  for (const m of r.snapshot?.kpis ?? []) {
    const row = ws.addRow([m.label, val(m), m.unit ?? "", src(m)]);
    if (typeof m.value === "number") row.getCell(2).numFmt = m.unit === "%" ? FMT.pct : m.unit === "x" ? FMT.mult : FMT.int;
  }
  zebra(ws, kStart, ws.rowCount, 4);

  // Thesis one-liner + sources summary.
  ws.addRow([]);
  title(ws, "Thesis");
  const t = ws.addRow([(r.thesis?.supports?.[0]?.text ?? r.snapshot?.stance_rationale ?? "").slice(0, 300)]);
  ws.mergeCells(`A${t.number}:F${t.number}`);
  t.getCell(1).alignment = { wrapText: true };
  t.height = 30;

  ws.addRow([]);
  title(ws, "Sources used");
  const names = (r.sources ?? []).slice(0, 10).map((s) => s.title).join(" · ");
  const sg = ws.addRow([`${r.sources?.length ?? 0} sources: ${names}`]);
  ws.mergeCells(`A${sg.number}:F${sg.number}`);
  sg.getCell(1).font = { color: { argb: MUTED }, size: 10 };
  sg.getCell(1).alignment = { wrapText: true };
  sg.height = 30;

  if (r.is_sample) {
    ws.addRow([]);
    const w = ws.addRow(["⚠ ILLUSTRATIVE SAMPLE — figures are representative, not live. Run the engine for source-backed data."]);
    ws.mergeCells(`A${w.number}:F${w.number}`);
    w.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
    w.getCell(1).font = { bold: true, color: { argb: AMBER } };
  }

  ws.addRow([]);
  const gen = ws.addRow([`Generated by glowstocks · as of ${r.as_of} · ${r.last_updated.slice(0, 10)} · ${r.currency}`]);
  gen.getCell(1).font = { color: { argb: MUTED }, italic: true, size: 9 };
  ws.views = [{ showGridLines: false }];
}

/* ---------------------------------------------------------------- snapshot */

function snapshotSheet({ wb }: H, r: CompanyReport) {
  const ws = wb.addWorksheet("Snapshot");
  title(ws, "Business model");
  const bm = ws.addRow([r.snapshot?.business_model ?? NA]);
  ws.mergeCells(`A${bm.number}:F${bm.number}`);
  bm.getCell(1).alignment = { wrapText: true };
  bm.height = 56;
  ws.addRow([]);
  title(ws, "Headline KPIs");
  const h = headerRow(ws, ["Metric", "Value", "Unit", "Source", "Date", "Locator"]);
  const start = h.number + 1;
  for (const m of r.snapshot?.kpis ?? []) {
    const row = ws.addRow([m.label, val(m), m.unit ?? "", src(m), dt(m), loc(m)]);
    if (typeof m.value === "number") row.getCell(2).numFmt = m.unit === "%" ? FMT.pct : m.unit === "x" ? FMT.mult : FMT.int;
  }
  zebra(ws, start, ws.rowCount, 6);
  autofit(ws);
}

/* ------------------------------------------------------- business & segments */

function businessSheet({ wb }: H, r: CompanyReport) {
  const ws = wb.addWorksheet("Business & Segments");
  title(ws, "Revenue by segment");
  const sh = headerRow(ws, ["Segment", "% revenue", "Trend", "Note", "Source"]);
  const sStart = sh.number + 1;
  for (const s of r.business?.segments ?? []) {
    const row = ws.addRow([s.name, val(s.pct_revenue), s.trend, s.note ?? "", src(s.pct_revenue)]);
    row.getCell(2).numFmt = FMT.pct;
    row.getCell(3).font = { color: { argb: s.trend === "growing" ? GREEN : s.trend === "shrinking" ? RED : MUTED } };
  }
  const sEnd = ws.rowCount;
  zebra(ws, sStart, sEnd, 5);
  if (sEnd >= sStart) dataBar(ws, `B${sStart}:B${sEnd}`);

  ws.addRow([]);
  title(ws, "Revenue by geography");
  const gh = headerRow(ws, ["Region", "% revenue", "Driver", "Risk", "Source"]);
  const gStart = gh.number + 1;
  for (const g of r.business?.geographies ?? []) {
    const row = ws.addRow([g.region, val(g.pct_revenue), g.driver ?? "", g.risk ?? "", src(g.pct_revenue)]);
    row.getCell(2).numFmt = FMT.pct;
  }
  const gEnd = ws.rowCount;
  zebra(ws, gStart, gEnd, 5);
  if (gEnd >= gStart) dataBar(ws, `B${gStart}:B${gEnd}`);
  autofit(ws);
}

/* ---------------------------------------------------- customers & capacity */

function customersCapacitySheet({ wb }: H, r: CompanyReport) {
  const ws = wb.addWorksheet("Customers & Capacity");
  const c = r.customers;
  title(ws, "Client concentration");
  const ch = headerRow(ws, ["Client group", "% revenue", "Names", "Risk", "Source"]);
  const cStart = ch.number + 1;
  for (const g of c?.groups ?? []) {
    const row = ws.addRow([g.segment, val(g.concentration), g.names ?? "", g.risk ?? "", src(g.concentration)]);
    row.getCell(2).numFmt = FMT.pct;
  }
  const cEnd = ws.rowCount;
  zebra(ws, cStart, cEnd, 5);
  if (cEnd >= cStart) dataBar(ws, `B${cStart}:B${cEnd}`);

  ws.addRow([]);
  title(ws, "Order book / pipeline");
  const oh = headerRow(ws, ["Metric", "Value", "Mix", "Coverage", "QoQ %", "Source"]);
  const oStart = oh.number + 1;
  for (const o of c?.order_book ?? []) {
    const row = ws.addRow([o.metric, val(o.value), o.mix ?? "", val(o.coverage ?? null), val(o.qoq_change ?? null), src(o.value)]);
    row.getCell(2).numFmt = FMT.cr;
    row.getCell(4).numFmt = FMT.mult;
    row.getCell(5).numFmt = FMT.pct;
  }
  zebra(ws, oStart, ws.rowCount, 6);

  ws.addRow([]);
  title(ws, `Footprint (${r.capacity?.kind ?? "n/a"})`);
  const mh = headerRow(ws, ["Metric", "Value", "Unit", "Source"]);
  const mStart = mh.number + 1;
  for (const m of r.capacity?.metrics ?? []) {
    const row = ws.addRow([m.label, val(m), m.unit ?? "", src(m)]);
    if (typeof m.value === "number") row.getCell(2).numFmt = m.unit === "%" ? FMT.pct : FMT.int;
  }
  zebra(ws, mStart, ws.rowCount, 4);

  ws.addRow([]);
  title(ws, "Sites");
  const sh = headerRow(ws, ["Site", "Product", "Capacity", "Utilization", "Capex", "Expansion", "Timeline", "Source"]);
  const sStart = sh.number + 1;
  for (const s of r.capacity?.sites ?? []) {
    const row = ws.addRow([s.site, s.product ?? "", val(s.capacity ?? null), val(s.utilization ?? null), val(s.capex ?? null), s.expansion ?? "", s.timeline ?? "", src(s.capacity ?? s.utilization ?? null)]);
    row.getCell(4).numFmt = FMT.pct;
    row.getCell(3).numFmt = FMT.int;
    row.getCell(5).numFmt = FMT.cr;
  }
  zebra(ws, sStart, ws.rowCount, 8);
  autofit(ws);
}

/* --------------------------------------------------------------- financials */

function finRow(ws: ExcelJS.Worksheet, label: string, c: AnyCited, fmt: string) {
  const row = ws.addRow([label, val(c), c?.available ? c.unit ?? "" : "", src(c), dt(c), loc(c)]);
  if (typeof c?.value === "number") row.getCell(2).numFmt = fmt;
  return row;
}

function financialsSheet({ wb }: H, r: CompanyReport) {
  const ws = wb.addWorksheet("Financials");
  const f = r.financials;
  const period = (p: PeriodFinancials | undefined, heading: string) => {
    if (!p) return;
    title(ws, heading + ` — ${p.period}`);
    const h = headerRow(ws, ["Metric", "Value", "Unit", "Source", "Date", "Locator"]);
    const s = h.number + 1;
    finRow(ws, "Revenue", p.revenue, FMT.cr);
    finRow(ws, "EBITDA", p.ebitda ?? null, FMT.cr);
    finRow(ws, "EBITDA margin", p.ebitda_margin ?? null, FMT.pct);
    finRow(ws, "EBIT margin", p.ebit_margin ?? null, FMT.pct);
    finRow(ws, "PAT", p.pat, FMT.cr);
    finRow(ws, "PAT margin", p.pat_margin ?? null, FMT.pct);
    finRow(ws, "Operating cash flow", p.ocf ?? null, FMT.cr);
    finRow(ws, "Free cash flow", p.fcf ?? null, FMT.cr);
    finRow(ws, "Net debt (−ve = net cash)", p.net_debt ?? null, FMT.cr);
    finRow(ws, "ROCE", p.roce ?? null, FMT.pct);
    finRow(ws, "ROE", p.roe ?? null, FMT.pct);
    zebra(ws, s, ws.rowCount, 6);
    ws.addRow([]);
  };
  period(f?.latest_quarter, "Latest quarter");
  period(f?.latest_fy, "Latest FY");

  title(ws, "5-year history");
  const h = headerRow(ws, ["Year", "Revenue", "EBITDA", "EBITDA %", "PAT", "PAT %", "EPS", "Source"]);
  const s = h.number + 1;
  for (const y of f?.history ?? []) {
    const row = ws.addRow([y.period, val(y.revenue), val(y.ebitda ?? null), val(y.ebitda_margin ?? null), val(y.pat), val(y.pat_margin ?? null), val(y.eps ?? null), src(y.revenue)]);
    [2, 3, 5].forEach((i) => (row.getCell(i).numFmt = FMT.cr));
    [4, 6].forEach((i) => (row.getCell(i).numFmt = FMT.pct));
    row.getCell(7).numFmt = FMT.price;
  }
  const end = ws.rowCount;
  zebra(ws, s, end, 8);
  if (end >= s) {
    dataBar(ws, `B${s}:B${end}`);
    dataBar(ws, `E${s}:E${end}`);
  }
  autofit(ws);
}

/* ---------------------------------------------------- growth & concall */

function growthConcallSheet({ wb }: H, r: CompanyReport) {
  const ws = wb.addWorksheet("Growth & Concall");
  const g = r.growth;
  title(ws, "Growth drivers");
  const dh = headerRow(ws, ["Driver", "Direction", "Detail", "Metric", "Source"]);
  const dStart = dh.number + 1;
  for (const d of g?.drivers ?? []) {
    const row = ws.addRow([d.name, d.direction, d.detail, val(d.metric ?? null), src(d.metric ?? null)]);
    row.getCell(2).font = { color: { argb: d.direction === "tailwind" ? GREEN : d.direction === "headwind" ? RED : MUTED } };
    if (typeof d.metric?.value === "number") row.getCell(4).numFmt = d.metric.unit === "%" ? FMT.pct : FMT.int;
  }
  zebra(ws, dStart, ws.rowCount, 5);

  ws.addRow([]);
  title(ws, "Catalyst watchlist");
  const chh = headerRow(ws, ["Catalyst", "Timing", "KPI", "Confirms", "Falsifies"]);
  const chStart = chh.number + 1;
  for (const c of g?.catalysts ?? []) ws.addRow([c.catalyst, c.timing, c.kpi, c.confirms ?? "", c.falsifies ?? ""]);
  zebra(ws, chStart, ws.rowCount, 5);

  ws.addRow([]);
  title(ws, "Downside triggers");
  for (const t of g?.downside_triggers ?? []) ws.addRow(["▼", t]).getCell(1).font = { color: { argb: RED } };

  ws.addRow([]);
  const cc = r.concall;
  title(ws, `Concall highlights — ${cc?.period ?? ""}${cc?.tone ? " · " + cc.tone : ""}`);
  const hh = headerRow(ws, ["Theme", "Quote", "Speaker", "Date", "Source"]);
  const hStart = hh.number + 1;
  for (const h of cc?.highlights ?? []) ws.addRow([h.theme, h.quote, h.speaker, h.date ?? "", h.source ?? ""]);
  zebra(ws, hStart, ws.rowCount, 5);

  ws.addRow([]);
  title(ws, "So-what insights");
  for (const ins of cc?.insights ?? []) ws.addRow(["•", ins]);
  autofit(ws);
  ws.getColumn(3).width = Math.min(70, ws.getColumn(3).width ?? 40);
}

/* ---------------------------------------------------- peers & estimates */

function peersEstimatesSheet({ wb }: H, r: CompanyReport) {
  const ws = wb.addWorksheet("Peers & Estimates");
  title(ws, "Peer comparison");
  const ph = headerRow(ws, ["Company", "Ticker", "Price", "M-cap", "P/E", "EV/EBITDA", "ROE", "ROCE", "ROA", "Sales 5Y", "Profit 5Y", "D/E", "Source(s)"]);
  const pStart = ph.number + 1;
  for (const p of r.peers?.peers ?? []) {
    const row = ws.addRow([`${p.name}${p.is_self ? " ★" : ""}`, p.ticker ?? "", val(p.price), val(p.mcap), val(p.pe), val(p.ev_ebitda), val(p.roe), val(p.roce), val(p.roa), val(p.sales_growth_5y), val(p.profit_growth_5y), val(p.de), peerSources(p)]);
    row.getCell(3).numFmt = FMT.price;
    row.getCell(4).numFmt = FMT.cr;
    [5, 6, 12].forEach((i) => (row.getCell(i).numFmt = FMT.mult));
    [7, 8, 9, 10, 11].forEach((i) => (row.getCell(i).numFmt = FMT.pct));
    if (p.is_self) row.eachCell((cell) => (cell.font = { ...(cell.font ?? {}), bold: true }));
  }
  const pEnd = ws.rowCount;
  zebra(ws, pStart, pEnd, 13);
  if (pEnd >= pStart) dataBar(ws, `G${pStart}:G${pEnd}`); // ROE

  ws.addRow([]);
  const e = r.estimates;
  title(ws, "Street estimates");
  if (e?.available) {
    const eh = headerRow(ws, ["Period", "Revenue", "EPS", "Growth %", "Source(s)"]);
    const eStart = eh.number + 1;
    for (const f of e.forward) {
      const row = ws.addRow([f.period, val(f.revenue ?? null), val(f.eps ?? null), val(f.growth ?? null), joinSources(f.revenue ?? null, f.eps ?? null, f.growth ?? null)]);
      row.getCell(2).numFmt = FMT.cr;
      row.getCell(3).numFmt = FMT.price;
      row.getCell(4).numFmt = FMT.pct;
    }
    zebra(ws, eStart, ws.rowCount, 5);
    ws.addRow([]);
    // Each target/consensus row keeps its own cited source.
    ws.addRow(["Metric", "Value", "Source"]).eachCell((c) => (c.font = { bold: true, color: { argb: MUTED }, size: 10 }));
    ws.addRow(["Target low", val(e.target_low ?? null), src(e.target_low ?? null)]).getCell(2).numFmt = FMT.price;
    ws.addRow(["Target mean", val(e.target_mean ?? null), src(e.target_mean ?? null)]).getCell(2).numFmt = FMT.price;
    ws.addRow(["Target high", val(e.target_high ?? null), src(e.target_high ?? null)]).getCell(2).numFmt = FMT.price;
    ws.addRow(["Consensus rating", val(e.rating ?? null), src(e.rating ?? null)]);
    ws.addRow(["Analysts covering", val(e.analysts ?? null), src(e.analysts ?? null)]);
    ws.addRow(["EPS revisions", e.eps_revision ?? ""]);
  } else {
    ws.addRow(["Street estimates: Not available"]).getCell(1).font = { italic: true, color: { argb: MUTED } };
  }
  autofit(ws);
}

/* ------------------------------------------------------ thesis & risks */

function thesisRisksSheet({ wb }: H, r: CompanyReport) {
  const ws = wb.addWorksheet("Thesis & Risks");
  const th = r.thesis;
  title(ws, `Stance: ${th?.stance ?? NA}`);
  ws.addRow([]);
  title(ws, "Supports (bull)").getCell(1).font = { bold: true, color: { argb: GREEN } };
  for (const p of th?.supports ?? []) ws.addRow(["+", p.text]).getCell(1).font = { color: { argb: GREEN } };
  ws.addRow([]);
  title(ws, "Counters (bear)").getCell(1).font = { bold: true, color: { argb: RED } };
  for (const p of th?.counters ?? []) ws.addRow(["−", p.text]).getCell(1).font = { color: { argb: RED } };
  ws.addRow([]);
  title(ws, "What would change the view");
  for (const c of th?.change_my_mind ?? []) ws.addRow(["•", c]);

  ws.addRow([]);
  title(ws, "Scenarios");
  const sch = headerRow(ws, ["Scenario", "Probability %", "Rev CAGR %", "Margin %", "Exit P/E", "Target (INR)", "Upside %"]);
  const scStart = sch.number + 1;
  for (const s of th?.scenarios ?? []) {
    const row = ws.addRow([s.name, val(s.probability), val(s.revenue_cagr), val(s.margin), val(s.pe_exit), val(s.target_price), val(s.upside)]);
    [2, 3, 4, 7].forEach((i) => (row.getCell(i).numFmt = FMT.pct));
    row.getCell(5).numFmt = FMT.mult;
    row.getCell(6).numFmt = FMT.price;
    if (typeof s.upside?.value === "number") row.getCell(7).font = { color: { argb: s.upside.value >= 0 ? GREEN : RED }, bold: true };
  }
  zebra(ws, scStart, ws.rowCount, 7);

  ws.addRow([]);
  title(ws, "Risk register");
  const rh = headerRow(ws, ["Risk", "Severity", "Probability", "Evidence", "Transmission", "Mitigants"]);
  const rStart = rh.number + 1;
  const sevColor = (lv: string) => (lv === "High" ? RED : lv === "Medium" ? AMBER : lv === "Low" ? GREEN : MUTED);
  for (const row of r.risks?.register ?? []) {
    const rr = ws.addRow([row.risk, row.severity, row.probability, row.evidence ?? "", row.transmission ?? "", row.mitigants ?? ""]);
    rr.getCell(2).font = { color: { argb: sevColor(row.severity) }, bold: true };
    rr.getCell(3).font = { color: { argb: sevColor(row.probability) }, bold: true };
  }
  zebra(ws, rStart, ws.rowCount, 6);

  ws.addRow([]);
  title(ws, "Top downside scenarios");
  const dh = headerRow(ws, ["Scenario", "Probability %", "Trigger", "Impact"]);
  for (const d of r.risks?.downside_scenarios ?? []) {
    const row = ws.addRow([d.name, val(d.probability ?? null), d.trigger, d.impact ?? ""]);
    row.getCell(2).numFmt = FMT.pct;
  }

  ws.addRow([]);
  title(ws, "M&A / inorganic");
  if (r.mna?.found && r.mna.deals.length) {
    const mh = headerRow(ws, ["Date", "Target", "What", "Deal size", "Payment", "Status", "Rationale", "Source"]);
    for (const d of r.mna.deals) {
      const row = ws.addRow([d.date ?? "", d.target, d.what, val(d.deal_size ?? null), d.payment ?? "", d.status ?? "", d.rationale ?? "", d.source ?? ""]);
      row.getCell(4).numFmt = FMT.cr;
    }
  } else {
    ws.addRow(["No material M&A found."]).getCell(1).font = { italic: true, color: { argb: MUTED } };
  }
  autofit(ws);
  ws.getColumn(2).width = Math.min(60, Math.max(ws.getColumn(2).width ?? 30, 30));
}

/* -------------------------------------------------- sources & integrity */

function sourcesIntegritySheet({ wb }: H, r: CompanyReport) {
  const ws = wb.addWorksheet("Sources & Integrity");
  title(ws, "Integrity gate");
  const ih = headerRow(ws, ["Check", "Status", "Detail"]);
  const iStart = ih.number + 1;
  const stColor = (s: string) => (s === "pass" ? GREEN : s === "warn" ? AMBER : s === "fail" ? RED : MUTED);
  for (const c of r.integrity?.checks ?? []) {
    const row = ws.addRow([c.check, c.status.toUpperCase(), c.detail ?? ""]);
    row.getCell(2).font = { color: { argb: stColor(c.status) }, bold: true };
  }
  zebra(ws, iStart, ws.rowCount, 3);
  if (r.integrity?.coverage_note) {
    ws.addRow([]);
    const cn = ws.addRow(["Coverage note", r.integrity.coverage_note]);
    ws.mergeCells(`B${cn.number}:F${cn.number}`);
    cn.getCell(2).alignment = { wrapText: true };
  }

  ws.addRow([]);
  title(ws, "Sources — the provenance spine");
  const sh = headerRow(ws, ["#", "Title", "Type", "Date", "Locator", "URL"]);
  const sStart = sh.number + 1;
  for (const s of r.sources ?? []) ws.addRow([s.id, s.title, s.type, s.date ?? "", s.locator ?? "", s.url ?? ""]);
  zebra(ws, sStart, ws.rowCount, 6);
  autofit(ws);
  ws.getColumn(6).width = Math.min(60, ws.getColumn(6).width ?? 40);
}

/** Build the full premium workbook for a report. */
export function buildWorkbook(r: CompanyReport): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "glowstocks";
  wb.created = new Date();
  const h: H = { wb };
  coverSheet(h, r);
  snapshotSheet(h, r);
  businessSheet(h, r);
  customersCapacitySheet(h, r);
  financialsSheet(h, r);
  growthConcallSheet(h, r);
  peersEstimatesSheet(h, r);
  thesisRisksSheet(h, r);
  sourcesIntegritySheet(h, r);
  // Freeze each sheet through its first coloured header row (not the title row
  // above it), so the table's column labels stay pinned while scrolling. Sheets
  // whose first table starts deep — e.g. Thesis & Risks, which opens with prose
  // and bullet blocks — would freeze most of the viewport, so leave those
  // unfrozen; gridlines stay on everywhere.
  wb.eachSheet((ws) => {
    if (ws.name === "Cover") return;
    const hr = firstHeaderRow.get(ws);
    ws.views = hr && hr <= 8
      ? [{ state: "frozen", ySplit: hr, showGridLines: true }]
      : [{ showGridLines: true }];
  });
  return wb;
}
