// Bespoke premium workbook for glowstocks — a branded Cover sheet plus one sheet
// per report section, every sheet rendered generically from the SHARED report
// model (buildReportModel). Because the full-report PDF renders the same model,
// the two exports cannot drift apart on coverage. Styling stays bespoke: frozen
// coloured headers, zebra striping, gridlines, unit-driven number formats,
// in-cell data bars, Source(s) columns. "Not available" → n/a; never 0 or blank.

import ExcelJS from "exceljs";
import type { Cited, CompanyReport } from "@/lib/types/report";
import { buildReportModel, type Cell, type Part, type SectionModel } from "@/lib/export/reportModel";

// Brand + status palette (hex → ARGB).
const INDIGO = "FF4F46E5";
const INDIGO_DK = "FF3730A3";
const INK = "FF111827";
const MUTED = "FF6B7280";
const ZEBRA = "FFF7F8FB";
const AMBER = "FFB54708";
const STANCE_FILL: Record<string, string> = { BUY: "FF0CA30C", HOLD: "FFEAA50B", SELL: "FFD03B3B" };
const SEQ_BAR = "FF9EC5F4";

// Row number of each sheet's FIRST coloured header band → freeze there.
const firstHeaderRow = new WeakMap<ExcelJS.Worksheet, number>();

/** Excel number format for a unit (so a ratio is never shown as ₹ crore). */
function unitNumFmt(unit?: string): string {
  switch ((unit ?? "").trim()) {
    case "INR cr": case "₹ cr": case "cr": return "#,##0;[Red]-#,##0";
    case "INR": case "₹": return "₹#,##0";
    case "%": return '0.0"%"';
    case "x": case "ratio": return '0.0"x"';
    case "pp": return '+0.0"pp";[Red]-0.0"pp"';
    case "bps": return '+0" bps";[Red]-0" bps"';
    case "months": return '0" months"';
    case "days": return '0" days"';
    case "years": return '0" years"';
    default: return "#,##0";
  }
}

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

function titleBand(ws: ExcelJS.Worksheet, text: string) {
  const row = ws.addRow([text]);
  row.getCell(1).font = { bold: true, size: 12, color: { argb: INDIGO_DK } };
  row.height = 18;
  return row;
}

function autofit(ws: ExcelJS.Worksheet, min = 10, max = 60) {
  const n = ws.columnCount;
  for (let i = 1; i <= n; i++) {
    let w = min;
    ws.getColumn(i).eachCell({ includeEmpty: false }, (cell) => {
      const v = cell.value;
      const str = v == null ? "" : typeof v === "object" ? ((v as { text?: string }).text ?? "") : String(v);
      if (str.length + 2 > w) w = str.length + 2;
    });
    ws.getColumn(i).width = Math.min(max, Math.max(min, w));
  }
}

function dataBar(ws: ExcelJS.Worksheet, ref: string) {
  ws.addConditionalFormatting({
    ref,
    rules: [{ type: "dataBar", priority: 1, cfvo: [{ type: "min" }, { type: "max" }], color: { argb: SEQ_BAR } } as unknown as ExcelJS.ConditionalFormattingRule],
  });
}

/** Write one model Cell into a worksheet cell, honouring unit / state / link. */
function applyCell(c: ExcelJS.Cell, cell: Cell) {
  if (cell.url && cell.numeric === null && cell.text && cell.text !== "—") {
    c.value = { text: cell.text, hyperlink: cell.url } as ExcelJS.CellHyperlinkValue;
    c.font = { color: { argb: INDIGO }, underline: true };
  } else if (cell.numeric !== null) {
    c.value = cell.numeric;
    c.numFmt = unitNumFmt(cell.unit);
  } else {
    c.value = cell.text;
    if (cell.muted) c.font = { italic: true, color: { argb: MUTED } };
  }
  if (cell.align === "right") c.alignment = { ...(c.alignment ?? {}), horizontal: "right" };
}

/* ------------------------------------------------------------------- cover */

const coverVal = (c: Cited<number | string>): number | string => (c.available && c.value !== null && c.value !== undefined ? c.value : "n/a (not disclosed)");
const coverSrc = (c: Cited<number | string>): string => (c.available ? c.source ?? "" : "");

function coverSheet(wb: ExcelJS.Workbook, r: CompanyReport) {
  const ws = wb.addWorksheet("Cover", { properties: { defaultColWidth: 16 } });
  ws.columns = [{ width: 22 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 22 }, { width: 22 }];

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
  ws.getCell("A4").value = `${r.company}  (${r.ticker})`;
  ws.getCell("A4").font = { bold: true, size: 16, color: { argb: INK } };
  ws.mergeCells("A5:F5");
  ws.getCell("A5").value = `${r.exchange}  ·  ${r.snapshot?.sector ?? ""}  ·  as of ${r.as_of}`;
  ws.getCell("A5").font = { color: { argb: MUTED }, size: 11 };

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

  ws.addRow([]);
  titleBand(ws, "Headline KPIs");
  const kh = headerRow(ws, ["Metric", "Value", "Unit", "Source"]);
  const kStart = kh.number + 1;
  for (const m of r.snapshot?.kpis ?? []) {
    const row = ws.addRow([m.label, coverVal(m), m.unit ?? "", coverSrc(m)]);
    if (typeof m.value === "number") row.getCell(2).numFmt = unitNumFmt(m.unit);
  }
  zebra(ws, kStart, ws.rowCount, 4);

  ws.addRow([]);
  titleBand(ws, "Thesis");
  const t = ws.addRow([(r.thesis?.supports?.[0]?.text ?? r.snapshot?.stance_rationale ?? "").slice(0, 300)]);
  ws.mergeCells(`A${t.number}:F${t.number}`);
  t.getCell(1).alignment = { wrapText: true };
  t.height = 30;

  ws.addRow([]);
  titleBand(ws, "Sources used");
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

/* ------------------------------------------------ generic section sheet */

const SHEET_NAME: Record<string, string> = {
  snapshot: "Snapshot",
  business: "Business & Segments",
  customers: "Customers & Capacity",
  financials: "Financials",
  growth: "Growth & Concall",
  peers: "Peers & Estimates",
  thesis: "Thesis & Risks",
  integrity: "Sources & Integrity",
};

function renderPart(ws: ExcelJS.Worksheet, part: Part) {
  if (part.kind === "prose") {
    if (part.title) titleBand(ws, part.title);
    const row = ws.addRow([part.text]);
    ws.mergeCells(`A${row.number}:F${row.number}`);
    row.getCell(1).alignment = { wrapText: true };
    row.height = Math.min(90, 14 + Math.ceil(part.text.length / 90) * 14);
    return;
  }
  if (part.kind === "note") {
    const row = ws.addRow([part.text]);
    ws.mergeCells(`A${row.number}:F${row.number}`);
    row.getCell(1).font = { italic: true, color: { argb: part.tone === "warn" ? AMBER : MUTED } };
    row.getCell(1).alignment = { wrapText: true };
    return;
  }
  if (part.kind === "list") {
    if (part.title) titleBand(ws, part.title);
    const mark = part.tone === "danger" ? "▼" : part.tone === "good" ? "+" : "•";
    const color = part.tone === "danger" ? "FFB42318" : part.tone === "good" ? "FF067647" : INK;
    for (const it of part.items) {
      const row = ws.addRow([mark, it]);
      row.getCell(1).font = { color: { argb: color } };
      ws.mergeCells(`B${row.number}:F${row.number}`);
      row.getCell(2).alignment = { wrapText: true };
    }
    return;
  }
  if (part.kind === "kv") {
    if (part.title) titleBand(ws, part.title);
    const h = headerRow(ws, ["Metric", "Value", "Source(s)"]);
    const start = h.number + 1;
    for (const row of part.rows) {
      const xr = ws.addRow([row.label, null, row.cell.sources.join(" · ")]);
      applyCell(xr.getCell(2), row.cell);
      xr.getCell(1).font = { color: { argb: MUTED } };
    }
    zebra(ws, start, ws.rowCount, 3);
    return;
  }
  // table
  if (part.title) titleBand(ws, part.title);
  if (!part.rows.length) {
    ws.addRow(["Not available"]).getCell(1).font = { italic: true, color: { argb: MUTED } };
    return;
  }
  const h = headerRow(ws, part.columns);
  const start = h.number + 1;
  for (const row of part.rows) {
    const xr = ws.addRow(part.columns.map(() => null));
    row.forEach((cell, j) => applyCell(xr.getCell(j + 1), cell));
  }
  const end = ws.rowCount;
  zebra(ws, start, end, part.columns.length);
  if (part.dataBarCol !== undefined && end >= start) {
    const letter = ws.getColumn(part.dataBarCol + 1).letter;
    dataBar(ws, `${letter}${start}:${letter}${end}`);
  }
}

function renderSectionSheet(wb: ExcelJS.Workbook, section: SectionModel) {
  const ws = wb.addWorksheet(SHEET_NAME[section.key] ?? section.title);
  if (section.state === "not_applicable" && !section.parts.some((p) => p.kind !== "note")) {
    titleBand(ws, section.title);
  }
  for (const part of section.parts) renderPart(ws, part);
  autofit(ws);
}

/** Build the full premium workbook for a report. */
export function buildWorkbook(r: CompanyReport): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "glowstocks";
  wb.created = new Date();
  coverSheet(wb, r);
  for (const section of buildReportModel(r)) renderSectionSheet(wb, section);

  // Freeze each sheet through its first coloured header row (shallow sheets
  // only; a sheet whose first table starts deep would freeze the viewport).
  wb.eachSheet((ws) => {
    if (ws.name === "Cover") return;
    const hr = firstHeaderRow.get(ws);
    ws.views = hr && hr <= 8 ? [{ state: "frozen", ySplit: hr, showGridLines: true }] : [{ showGridLines: true }];
  });
  return wb;
}
