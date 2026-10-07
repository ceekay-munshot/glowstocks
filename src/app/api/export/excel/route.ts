import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import type { Cited, CompanyReport } from "@/lib/types/report";

export const dynamic = "force-dynamic";

const HEADER_ARGB = "FF4F46E5"; // indigo
const SUBHEAD_ARGB = "FFEEF2FF";
const NA = "Not available";

const CUR = '#,##0;[Red]-#,##0'; // INR crore / INR
const PCT = '0.0"%"';
const MULT = '0.0"x"';

function v(c?: Cited<number | string> | null): number | string {
  if (!c || !c.available || c.value === null || c.value === undefined) return NA;
  return c.value;
}
function src(c?: Cited<number | string> | null): string {
  if (!c || !c.available) return "";
  return [c.source, c.date, c.locator].filter(Boolean).join(" · ");
}

function styleHeader(ws: ExcelJS.Worksheet, row = 1) {
  ws.getRow(row).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_ARGB } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: "FFCBD5E1" } } };
  });
  ws.views = [{ state: "frozen", ySplit: row }];
}

function titleRow(ws: ExcelJS.Worksheet, text: string) {
  const r = ws.addRow([text]);
  r.font = { bold: true, size: 12, color: { argb: "FF111827" } };
  return r;
}

export async function POST(request: Request) {
  let report: CompanyReport;
  try {
    const body = (await request.json()) as { report?: CompanyReport };
    if (!body.report || !body.report.ticker) throw new Error("no report");
    report = body.report;
  } catch {
    return NextResponse.json({ ok: false, error: "A report body is required." }, { status: 400 });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "glowstocks";
  wb.created = new Date();

  /* ---- Snapshot ---- */
  const snap = wb.addWorksheet("Snapshot", { properties: { defaultColWidth: 18 } });
  snap.addRow([report.company, report.ticker]);
  snap.getRow(1).font = { bold: true, size: 14 };
  snap.addRow([`${report.exchange} · ${report.snapshot?.sector ?? ""}`, `as of ${report.as_of}`]);
  snap.addRow([`Stance: ${report.snapshot?.stance ?? NA}`, report.snapshot?.stance_rationale ?? ""]);
  snap.addRow([report.units_note ?? ""]);
  snap.addRow([]);
  const kpiHead = snap.addRow(["Metric", "Value", "Unit", "Source"]);
  kpiHead.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_ARGB } };
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });
  const kpiHeadNum = kpiHead.number;
  for (const m of report.snapshot?.kpis ?? []) {
    snap.addRow([m.label, v(m), m.unit ?? "", src(m)]);
  }
  snap.getColumn(1).width = 26;
  snap.getColumn(2).width = 16;
  snap.getColumn(4).width = 44;
  snap.views = [{ state: "frozen", ySplit: kpiHeadNum }];

  /* ---- Financials ---- */
  const fin = wb.addWorksheet("Financials");
  fin.columns = [
    { header: "Year", key: "y", width: 10 },
    { header: "Revenue (INR cr)", key: "rev", width: 18 },
    { header: "EBITDA (INR cr)", key: "eb", width: 18 },
    { header: "EBITDA %", key: "ebm", width: 12 },
    { header: "PAT (INR cr)", key: "pat", width: 16 },
    { header: "PAT %", key: "patm", width: 10 },
    { header: "EPS (INR)", key: "eps", width: 12 },
  ];
  for (const y of report.financials?.history ?? []) {
    fin.addRow({ y: y.period, rev: v(y.revenue), eb: v(y.ebitda ?? null), ebm: v(y.ebitda_margin ?? null), pat: v(y.pat), patm: v(y.pat_margin ?? null), eps: v(y.eps ?? null) });
  }
  [2, 3, 5].forEach((i) => (fin.getColumn(i).numFmt = CUR));
  [4, 6].forEach((i) => (fin.getColumn(i).numFmt = PCT));
  fin.getColumn(7).numFmt = CUR;
  styleHeader(fin);

  /* ---- Business ---- */
  const biz = wb.addWorksheet("Business");
  titleRow(biz, "Segments");
  const segHead = biz.addRow(["Segment", "% revenue", "Trend", "Source"]);
  segHead.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEAD_ARGB } }));
  segHead.font = { bold: true };
  for (const s of report.business?.segments ?? []) {
    biz.addRow([s.name, v(s.pct_revenue), s.trend, src(s.pct_revenue)]);
  }
  biz.addRow([]);
  titleRow(biz, "Geographies");
  const geoHead = biz.addRow(["Region", "% revenue", "Driver", "Risk"]);
  geoHead.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEAD_ARGB } }));
  geoHead.font = { bold: true };
  for (const g of report.business?.geographies ?? []) {
    biz.addRow([g.region, v(g.pct_revenue), g.driver ?? "", g.risk ?? ""]);
  }
  biz.getColumn(1).width = 30;
  biz.getColumn(2).width = 12;
  biz.getColumn(2).numFmt = PCT;
  biz.getColumn(3).width = 32;
  biz.getColumn(4).width = 32;

  /* ---- Peers ---- */
  const peers = wb.addWorksheet("Peers");
  peers.columns = [
    { header: "Company", key: "name", width: 26 },
    { header: "Price (INR)", key: "price", width: 12 },
    { header: "M-cap (INR cr)", key: "mcap", width: 16 },
    { header: "P/E", key: "pe", width: 9 },
    { header: "EV/EBITDA", key: "ev", width: 12 },
    { header: "ROE %", key: "roe", width: 9 },
    { header: "ROCE %", key: "roce", width: 9 },
    { header: "ROA %", key: "roa", width: 9 },
    { header: "Sales 5Y %", key: "s5", width: 11 },
    { header: "Profit 5Y %", key: "p5", width: 11 },
    { header: "D/E", key: "de", width: 8 },
  ];
  for (const p of report.peers?.peers ?? []) {
    peers.addRow({
      name: `${p.name}${p.is_self ? " ★" : ""}`,
      price: v(p.price), mcap: v(p.mcap), pe: v(p.pe), ev: v(p.ev_ebitda),
      roe: v(p.roe), roce: v(p.roce), roa: v(p.roa), s5: v(p.sales_growth_5y), p5: v(p.profit_growth_5y), de: v(p.de),
    });
  }
  [2, 3].forEach((i) => (peers.getColumn(i).numFmt = CUR));
  [4, 5, 11].forEach((i) => (peers.getColumn(i).numFmt = MULT));
  [6, 7, 8, 9, 10].forEach((i) => (peers.getColumn(i).numFmt = PCT));
  styleHeader(peers);

  /* ---- Thesis ---- */
  const th = wb.addWorksheet("Thesis");
  titleRow(th, `Stance: ${report.thesis?.stance ?? NA}`);
  th.addRow([]);
  titleRow(th, "Supports (bull)").font = { bold: true, color: { argb: "FF0CA30C" } };
  for (const p of report.thesis?.supports ?? []) th.addRow(["+", p.text]);
  th.addRow([]);
  titleRow(th, "Counters (bear)").font = { bold: true, color: { argb: "FFD03B3B" } };
  for (const p of report.thesis?.counters ?? []) th.addRow(["−", p.text]);
  th.addRow([]);
  titleRow(th, "What would change the view");
  for (const c of report.thesis?.change_my_mind ?? []) th.addRow(["•", c]);
  th.addRow([]);
  const scenHead = th.addRow(["Scenario", "Probability %", "Rev CAGR %", "Margin %", "Exit P/E", "Target (INR)", "Upside %"]);
  scenHead.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_ARGB } };
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });
  for (const s of report.thesis?.scenarios ?? []) {
    th.addRow([s.name, v(s.probability), v(s.revenue_cagr), v(s.margin), v(s.pe_exit), v(s.target_price), v(s.upside)]);
  }
  th.getColumn(2).width = 24;

  /* ---- Sources ---- */
  const so = wb.addWorksheet("Sources");
  so.columns = [
    { header: "#", key: "id", width: 6 },
    { header: "Title", key: "title", width: 42 },
    { header: "Type", key: "type", width: 18 },
    { header: "Date", key: "date", width: 14 },
    { header: "Locator", key: "loc", width: 20 },
    { header: "URL", key: "url", width: 50 },
  ];
  for (const s of report.sources ?? []) {
    so.addRow({ id: s.id, title: s.title, type: s.type, date: s.date ?? "", loc: s.locator ?? "", url: s.url ?? "" });
  }
  styleHeader(so);

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${report.ticker}-glowstocks.xlsx"`,
      "cache-control": "no-store",
    },
  });
}
