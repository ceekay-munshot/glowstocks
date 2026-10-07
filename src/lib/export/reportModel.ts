// The shared, render-agnostic model of a report — the single "walk the report →
// emit EVERY populated field" layer that BOTH exports (the full-report PDF and
// the Excel workbook) render from, so they can never drift apart on coverage.
//
// It fixes four recurring root causes centrally:
//  1. FULL COVERAGE — every section is walked systematically from the data; if a
//     field has a value it becomes a cell. No hand-picked subsets.
//  2. PROVENANCE — `sourcesCell` collects the DISTINCT sources (by source_id)
//     across a row's cited values, so a multi-metric row shows "Source(s)", not
//     one metric's source. The Sources spine keeps every clickable URL.
//  3. UNITS — every value goes through `formatValue`, which handles all units.
//  4. STATES — three distinct states: a section flagged not-applicable renders a
//     reason; a cited value with available=false renders "n/a (not disclosed)";
//     a field that is simply absent renders "—".
//
// Pure data only (no React / ECharts / ExcelJS), so it is safe to import from
// both the client print page and the server Excel route.

import { formatValue } from "@/lib/format";
import type {
  Cited,
  CompanyReport,
  Metric,
  PeriodFinancials,
  SourceRef,
} from "@/lib/types/report";

export const NA_DISCLOSED = "n/a (not disclosed)";
export const ABSENT = "—";

type AnyCited = Cited<number | string> | null | undefined;

export interface Cell {
  text: string;
  /** Present numeric value (for Excel number formats / data bars); else null. */
  numeric: number | null;
  unit?: string;
  /** Distinct source labels backing this cell / row. */
  sources: string[];
  /** Primary clickable source URL, when this cell is a provenance cell. */
  url: string | null;
  /** n/a or absent — renderers style these muted. */
  muted: boolean;
  align: "left" | "right";
}

export type Part =
  | { kind: "kv"; title?: string; rows: { label: string; cell: Cell }[] }
  | { kind: "table"; title?: string; columns: string[]; rows: Cell[][]; dataBarCol?: number }
  | { kind: "list"; title?: string; items: string[]; tone?: "default" | "danger" | "good" }
  | { kind: "prose"; title?: string; text: string }
  | { kind: "note"; text: string; tone?: "warn" | "muted" };

export type ChartId =
  | "segments" | "geography" | "customerMix" | "orderBook"
  | "financialsBars" | "margins" | "forwardRevenue" | "forwardEps" | "scenarioUpside";

export interface ChartRef {
  id: ChartId;
  title: string;
  has: boolean;
}

export interface SectionModel {
  key: string;
  title: string;
  state: "ok" | "not_applicable";
  /** not-applicable reason, or a coverage note. */
  note?: string;
  charts: ChartRef[];
  parts: Part[];
}

/* -------------------------------------------------------------- cell builders */

/** Distinct sources (by source_id, else the source label) across cited values. */
export function resolveSources(r: CompanyReport, ...cs: AnyCited[]): { labels: string[]; url: string | null } {
  const byId = new Map((r.sources ?? []).map((s) => [s.id, s]));
  const labels: string[] = [];
  let url: string | null = null;
  for (const c of cs) {
    if (!c || !c.available) continue;
    const label = (c.source_id && byId.get(c.source_id)?.title) || c.source;
    if (label && !labels.includes(label)) labels.push(label);
    if (!url && c.url) url = c.url;
  }
  return { labels, url };
}

/** A value cell from a cited datum, honouring the three states. */
export function citedCell(c: AnyCited, align: "left" | "right" = "right"): Cell {
  if (c === null || c === undefined) return { text: ABSENT, numeric: null, sources: [], url: null, muted: true, align };
  if (!c.available || c.value === null || c.value === undefined) return { text: NA_DISCLOSED, numeric: null, sources: [], url: null, muted: true, align };
  return {
    text: formatValue(c.value, c.unit),
    numeric: typeof c.value === "number" ? c.value : null,
    unit: c.unit,
    sources: [],
    url: null,
    muted: false,
    align,
  };
}

/** A value cell that also carries its own source label(s) inline (for kv rows
 *  where there is no separate Source(s) column). */
export function citedCellSourced(r: CompanyReport, c: AnyCited, align: "left" | "right" = "right"): Cell {
  const base = citedCell(c, align);
  if (base.muted) return base;
  return { ...base, sources: resolveSources(r, c).labels };
}

/** A plain text cell (left-aligned); absent string → "—". */
export function textCell(s?: string | null): Cell {
  const t = (s ?? "").trim();
  return { text: t || ABSENT, numeric: null, sources: [], url: null, muted: !t, align: "left" };
}

/** A "Source(s)" cell aggregating the distinct provenance of a row's values. */
export function sourcesCell(r: CompanyReport, ...cs: AnyCited[]): Cell {
  const { labels, url } = resolveSources(r, ...cs);
  return { text: labels.join(" · ") || ABSENT, numeric: null, sources: labels, url, muted: labels.length === 0, align: "left" };
}

/* ----------------------------------------------------------- section helpers */

/** All populated rows of a detailed period (latest quarter / FY). */
function periodRows(r: CompanyReport, p: PeriodFinancials): { label: string; cell: Cell }[] {
  const defs: [string, AnyCited][] = [
    ["Revenue", p.revenue],
    ["EBITDA", p.ebitda ?? null],
    ["EBITDA margin", p.ebitda_margin ?? null],
    ["EBIT", p.ebit ?? null],
    ["EBIT margin", p.ebit_margin ?? null],
    ["PAT", p.pat],
    ["PAT margin", p.pat_margin ?? null],
    ["Operating cash flow", p.ocf ?? null],
    ["Free cash flow", p.fcf ?? null],
    ["Net debt (−ve = net cash)", p.net_debt ?? null],
    ["ROCE", p.roce ?? null],
    ["ROE", p.roe ?? null],
  ];
  const rows = defs.filter(([, c]) => c !== null && c !== undefined).map(([label, c]) => ({ label, cell: citedCellSourced(r, c) }));
  if (p.one_offs) rows.push({ label: "One-offs", cell: textCell(p.one_offs) });
  return rows;
}

function metricRows(r: CompanyReport, ms: Metric[]): { label: string; cell: Cell }[] {
  return (ms ?? []).map((m) => ({ label: m.label, cell: citedCellSourced(r, m) }));
}

/* ----------------------------------------------------------------- the model */

export function buildReportModel(r: CompanyReport): SectionModel[] {
  const sections: SectionModel[] = [];
  const S = (s: SectionModel) => sections.push(s);

  /* -- Snapshot -- */
  {
    const parts: Part[] = [];
    if (r.snapshot?.business_model) parts.push({ kind: "prose", title: "Business model", text: r.snapshot.business_model });
    const meta: { label: string; cell: Cell }[] = [];
    if (r.snapshot?.sector) meta.push({ label: "Sector", cell: textCell(r.snapshot.sector) });
    if (r.snapshot?.industry) meta.push({ label: "Industry", cell: textCell(r.snapshot.industry) });
    if (r.snapshot?.stance_rationale) meta.push({ label: "Stance rationale", cell: textCell(r.snapshot.stance_rationale) });
    if (meta.length) parts.push({ kind: "kv", title: "Positioning", rows: meta });
    if (r.snapshot?.kpis?.length) parts.push({ kind: "kv", title: "Headline KPIs", rows: metricRows(r, r.snapshot.kpis) });
    S({ key: "snapshot", title: "Snapshot", state: "ok", charts: [], parts });
  }

  /* -- Business -- */
  {
    const parts: Part[] = [];
    if (r.business?.summary) parts.push({ kind: "prose", text: r.business.summary });
    const segs = r.business?.segments ?? [];
    if (segs.length) parts.push({
      kind: "table",
      title: "Revenue by segment",
      columns: ["Segment", "% revenue", "Revenue", "Trend", "Note", "Source(s)"],
      dataBarCol: 1,
      rows: segs.map((s) => [textCell(s.name), citedCell(s.pct_revenue), citedCell(s.revenue ?? null), textCell(s.trend), textCell(s.note), sourcesCell(r, s.pct_revenue, s.revenue ?? null)]),
    });
    const geos = r.business?.geographies ?? [];
    if (geos.length) parts.push({
      kind: "table",
      title: "Revenue by geography",
      columns: ["Region", "% revenue", "Driver", "Risk", "Source(s)"],
      dataBarCol: 1,
      rows: geos.map((g) => [textCell(g.region), citedCell(g.pct_revenue), textCell(g.driver), textCell(g.risk), sourcesCell(r, g.pct_revenue)]),
    });
    S({
      key: "business", title: "Business & segments", state: "ok",
      charts: [
        { id: "segments", title: "Revenue mix by segment", has: segs.some((s) => s.pct_revenue?.available) },
        { id: "geography", title: "Revenue by geography", has: geos.some((g) => g.pct_revenue?.available) },
      ],
      parts,
    });
  }

  /* -- Customers & capacity -- (two applicability-gated sub-blocks) */
  {
    const parts: Part[] = [];
    const charts: ChartRef[] = [];
    const cust = r.customers;
    if (cust && cust.applicable === false) {
      parts.push({ kind: "note", text: `Order-book / client-concentration model not applicable${cust.not_applicable_reason ? ` — ${cust.not_applicable_reason}` : "."}`, tone: "muted" });
    } else if (cust) {
      if (cust.summary) parts.push({ kind: "prose", title: "Customers", text: cust.summary });
      if (cust.groups?.length) parts.push({
        kind: "table", title: "Client concentration",
        columns: ["Client group", "% revenue", "Key names", "Risk", "Source(s)"], dataBarCol: 1,
        rows: cust.groups.map((g) => [textCell(g.segment), citedCell(g.concentration), textCell(g.names), textCell(g.risk), sourcesCell(r, g.concentration)]),
      });
      if (cust.order_book?.length) parts.push({
        kind: "table", title: "Order book / pipeline",
        columns: ["Metric", "Value", "Mix", "Coverage", "QoQ", "Source(s)"],
        rows: cust.order_book.map((o) => [textCell(o.metric), citedCell(o.value), textCell(o.mix), citedCell(o.coverage ?? null), citedCell(o.qoq_change ?? null), sourcesCell(r, o.value, o.coverage ?? null, o.qoq_change ?? null)]),
      });
      charts.push({ id: "customerMix", title: "Customer mix", has: (cust.groups ?? []).some((g) => g.concentration?.available) });
      charts.push({ id: "orderBook", title: "Order book / TCV (₹ cr)", has: (cust.order_book ?? []).some((o) => o.value?.available && o.value.unit === "INR cr") });
    }

    const cap = r.capacity;
    if (cap && cap.applicable === false) {
      parts.push({ kind: "note", text: `Manufacturing / delivery footprint not applicable${cap.not_applicable_reason ? ` — ${cap.not_applicable_reason}` : "."}`, tone: "muted" });
    } else if (cap) {
      if (cap.summary) parts.push({ kind: "prose", title: `Footprint (${cap.kind ?? "—"})`, text: cap.summary });
      if (cap.metrics?.length) parts.push({ kind: "kv", title: "Footprint metrics", rows: metricRows(r, cap.metrics) });
      if (cap.sites?.length) parts.push({
        kind: "table", title: "Sites",
        columns: ["Site", "Product", "Capacity", "Utilization", "Capex", "Expansion", "Timeline", "Source(s)"],
        rows: cap.sites.map((s) => [textCell(s.site), textCell(s.product), citedCell(s.capacity ?? null), citedCell(s.utilization ?? null), citedCell(s.capex ?? null), textCell(s.expansion), textCell(s.timeline), sourcesCell(r, s.capacity ?? null, s.utilization ?? null, s.capex ?? null)]),
      });
    }
    const naBoth = cust?.applicable === false && cap?.applicable === false;
    S({ key: "customers", title: "Customers & capacity", state: naBoth ? "not_applicable" : "ok", charts, parts });
  }

  /* -- Financials -- */
  {
    const parts: Part[] = [];
    const f = r.financials;
    if (f?.latest_quarter) parts.push({ kind: "kv", title: `Latest quarter — ${f.latest_quarter.period}`, rows: periodRows(r, f.latest_quarter) });
    if (f?.latest_fy) parts.push({ kind: "kv", title: `Latest FY — ${f.latest_fy.period}`, rows: periodRows(r, f.latest_fy) });
    const hist = f?.history ?? [];
    if (hist.length) parts.push({
      kind: "table", title: "5-year history",
      columns: ["Year", "Revenue", "EBITDA", "EBITDA %", "PAT", "PAT %", "EPS", "Source(s)"], dataBarCol: 1,
      rows: hist.map((y) => [textCell(y.period), citedCell(y.revenue), citedCell(y.ebitda ?? null), citedCell(y.ebitda_margin ?? null), citedCell(y.pat), citedCell(y.pat_margin ?? null), citedCell(y.eps ?? null), sourcesCell(r, y.revenue, y.ebitda ?? null, y.ebitda_margin ?? null, y.pat, y.pat_margin ?? null, y.eps ?? null)]),
    });
    S({
      key: "financials", title: "Financials", state: "ok",
      charts: [
        { id: "financialsBars", title: "Revenue · EBITDA · PAT (5Y, ₹ cr)", has: hist.length > 0 },
        { id: "margins", title: "Margins (5Y, %)", has: hist.length > 0 },
      ],
      parts,
    });
  }

  /* -- Growth & concall -- */
  {
    const parts: Part[] = [];
    const g = r.growth;
    if (g?.summary) parts.push({ kind: "prose", text: g.summary });
    if (g?.drivers?.length) parts.push({
      kind: "table", title: "Growth drivers",
      columns: ["Driver", "Direction", "Detail", "Metric", "Source(s)"],
      rows: g.drivers.map((d) => [textCell(d.name), textCell(d.direction), textCell(d.detail), citedCell(d.metric ?? null, "left"), sourcesCell(r, d.metric ?? null)]),
    });
    if (g?.catalysts?.length) parts.push({
      kind: "table", title: "Catalyst watchlist",
      columns: ["Catalyst", "Timing", "KPI", "Confirms", "Falsifies"],
      rows: g.catalysts.map((c) => [textCell(c.catalyst), textCell(c.timing), textCell(c.kpi), textCell(c.confirms), textCell(c.falsifies)]),
    });
    if (g?.downside_triggers?.length) parts.push({ kind: "list", title: "Downside triggers", items: g.downside_triggers, tone: "danger" });

    const cc = r.concall;
    if (cc && cc.available === false) {
      parts.push({ kind: "note", text: "No recent earnings call available.", tone: "muted" });
    } else if (cc) {
      const head = `Concall highlights${cc.period ? ` — ${cc.period}` : ""}${cc.tone ? ` · tone: ${cc.tone}` : ""}`;
      if (cc.highlights?.length) parts.push({
        kind: "table", title: head,
        columns: ["Theme", "Quote", "Speaker", "Date", "Source"],
        rows: cc.highlights.map((h) => [textCell(h.theme), textCell(h.quote), textCell(h.speaker), textCell(h.date), sourcesCell(r, { value: 1, available: true, source: h.source, source_id: h.source_id, url: h.url })]),
      });
      if (cc.insights?.length) parts.push({ kind: "list", title: "So-what insights", items: cc.insights });
    }
    S({ key: "growth", title: "Growth & concall", state: "ok", charts: [], parts });
  }

  /* -- Peers & estimates -- */
  {
    const parts: Part[] = [];
    const charts: ChartRef[] = [];
    const peers = r.peers?.peers ?? [];
    if (r.peers?.note) parts.push({ kind: "prose", text: r.peers.note });
    if (peers.length) parts.push({
      kind: "table", title: "Peer comparison",
      columns: ["Company", "Price", "M-cap", "P/E", "EV/EBITDA", "ROE", "ROCE", "ROA", "Sales 5Y", "Profit 5Y", "D/E", "Source(s)"], dataBarCol: 5,
      rows: peers.map((p) => [
        textCell(`${p.name}${p.is_self ? " ★" : ""}${p.ticker ? ` (${p.ticker})` : ""}`),
        citedCell(p.price ?? null), citedCell(p.mcap ?? null), citedCell(p.pe ?? null), citedCell(p.ev_ebitda ?? null),
        citedCell(p.roe ?? null), citedCell(p.roce ?? null), citedCell(p.roa ?? null), citedCell(p.sales_growth_5y ?? null), citedCell(p.profit_growth_5y ?? null), citedCell(p.de ?? null),
        sourcesCell(r, p.price ?? null, p.mcap ?? null, p.pe ?? null, p.ev_ebitda ?? null, p.roe ?? null, p.roce ?? null, p.roa ?? null, p.sales_growth_5y ?? null, p.profit_growth_5y ?? null, p.de ?? null),
      ]),
    });

    const e = r.estimates;
    if (e && e.available === false) {
      parts.push({ kind: "note", text: "Street estimates not available.", tone: "muted" });
    } else if (e) {
      if (e.summary) parts.push({ kind: "prose", title: "Street estimates", text: e.summary });
      if (e.forward?.length) parts.push({
        kind: "table", title: "Forward estimates",
        columns: ["Period", "Revenue", "EPS", "Growth", "Source(s)"], dataBarCol: 1,
        rows: e.forward.map((y) => [textCell(y.period), citedCell(y.revenue ?? null), citedCell(y.eps ?? null), citedCell(y.growth ?? null), sourcesCell(r, y.revenue ?? null, y.eps ?? null, y.growth ?? null)]),
      });
      const tgt: { label: string; cell: Cell }[] = [
        { label: "Target — low", cell: citedCellSourced(r, e.target_low ?? null) },
        { label: "Target — mean", cell: citedCellSourced(r, e.target_mean ?? null) },
        { label: "Target — high", cell: citedCellSourced(r, e.target_high ?? null) },
        { label: "Consensus rating", cell: citedCellSourced(r, e.rating ?? null, "left") },
        { label: "Analysts covering", cell: citedCellSourced(r, e.analysts ?? null) },
      ];
      if (e.eps_revision) tgt.push({ label: "EPS revisions", cell: textCell(e.eps_revision) });
      parts.push({ kind: "kv", title: "Street targets & consensus", rows: tgt });
      charts.push({ id: "forwardRevenue", title: "Forward revenue (₹ cr)", has: (e.forward ?? []).some((y) => y.revenue?.available) });
      charts.push({ id: "forwardEps", title: "Forward EPS (₹)", has: (e.forward ?? []).some((y) => y.eps?.available) });
    }
    S({ key: "peers", title: "Peers & estimates", state: "ok", charts, parts });
  }

  /* -- Thesis & risks -- */
  {
    const parts: Part[] = [];
    const th = r.thesis;
    if (th?.supports?.length) parts.push({ kind: "list", title: "Bull case", items: th.supports.map((p) => p.text), tone: "good" });
    if (th?.counters?.length) parts.push({ kind: "list", title: "Bear case", items: th.counters.map((p) => p.text), tone: "danger" });
    if (th?.change_my_mind?.length) parts.push({ kind: "list", title: "What would change the view", items: th.change_my_mind });
    const scen = th?.scenarios ?? [];
    if (scen.length) parts.push({
      kind: "table", title: "Scenarios",
      columns: ["Scenario", "Probability", "Rev CAGR", "Margin", "Exit P/E", "Target", "Upside", "Narrative", "Source(s)"],
      rows: scen.map((s) => [textCell(s.name), citedCell(s.probability ?? null), citedCell(s.revenue_cagr ?? null), citedCell(s.margin ?? null), citedCell(s.pe_exit ?? null), citedCell(s.target_price ?? null), citedCell(s.upside ?? null), textCell(s.narrative), sourcesCell(r, s.probability ?? null, s.target_price ?? null, s.upside ?? null)]),
    });

    const rk = r.risks;
    if (rk?.summary) parts.push({ kind: "prose", text: rk.summary });
    if (rk?.register?.length) parts.push({
      kind: "table", title: "Risk register",
      columns: ["Risk", "Severity", "Probability", "Evidence", "Transmission", "Leading indicators", "Mitigants"],
      rows: rk.register.map((x) => [textCell(x.risk), textCell(x.severity), textCell(x.probability), textCell(x.evidence), textCell(x.transmission), textCell(x.leading_indicators), textCell(x.mitigants)]),
    });
    if (rk?.downside_scenarios?.length) parts.push({
      kind: "table", title: "Top downside scenarios",
      columns: ["Scenario", "Trigger", "Impact", "Probability", "Source(s)"],
      rows: rk.downside_scenarios.map((d) => [textCell(d.name), textCell(d.trigger), textCell(d.impact), citedCell(d.probability ?? null), sourcesCell(r, d.probability ?? null)]),
    });

    const m = r.mna;
    if (m && m.found === false) {
      parts.push({ kind: "note", text: "No material M&A found.", tone: "muted" });
    } else if (m) {
      if (m.summary) parts.push({ kind: "prose", title: "M&A / inorganic", text: m.summary });
      if (m.deals?.length) parts.push({
        kind: "table", title: "M&A / inorganic",
        columns: ["Date", "Target", "What", "Deal size", "Payment", "Status", "Rationale", "Source(s)"],
        rows: m.deals.map((d) => [textCell(d.date), textCell(d.target), textCell(d.what), citedCell(d.deal_size ?? null), textCell(d.payment), textCell(d.status), textCell(d.rationale), sourcesCell(r, d.deal_size ?? null, { value: 1, available: !!(d.source || d.source_id), source: d.source, source_id: d.source_id, url: d.url })]),
      });
    }
    S({
      key: "thesis", title: "Thesis & risks", state: "ok",
      charts: [{ id: "scenarioUpside", title: "Scenario upside to target (%)", has: scen.some((s) => s.upside?.available) }],
      parts,
    });
  }

  /* -- Sources & integrity -- */
  {
    const parts: Part[] = [];
    const checks = r.integrity?.checks ?? [];
    if (checks.length) parts.push({
      kind: "table", title: "Integrity gate",
      columns: ["Check", "Status", "Detail"],
      rows: checks.map((c) => [textCell(c.check), textCell(c.status?.toUpperCase?.() ?? c.status), textCell(c.detail)]),
    });
    if (r.integrity?.coverage_note) parts.push({ kind: "note", text: r.integrity.coverage_note, tone: "muted" });
    parts.push({ kind: "table", title: "Sources — the provenance spine", columns: ["#", "Title", "Type", "Date", "Locator", "URL"], rows: sourceRows(r.sources ?? []) });
    S({ key: "integrity", title: "Sources & integrity", state: "ok", charts: [], parts });
  }

  return sections;
}

function sourceRows(sources: SourceRef[]): Cell[][] {
  return sources.map((s) => [
    textCell(s.id),
    textCell(s.title),
    textCell(s.type),
    textCell(s.date),
    textCell(s.locator ?? null),
    { text: s.url ?? ABSENT, numeric: null, sources: [], url: s.url ?? null, muted: !s.url, align: "left" },
  ]);
}

/* --------------------------------------------------------------- coverage guard */

const CONTENT_KEYS = new Set([
  "business_model", "stance_rationale", "sector", "industry", "summary", "note", "name", "segment",
  "names", "risk", "region", "driver", "label", "site", "product", "expansion", "timeline", "detail",
  "catalyst", "kpi", "confirms", "falsifies", "theme", "quote", "speaker", "tone", "trigger", "impact",
  "mitigants", "evidence", "transmission", "leading_indicators", "narrative", "rationale", "what",
  "target", "check", "coverage_note", "eps_revision", "mix", "text", "one_offs", "title", "period", "kind",
]);
const STRING_ARRAY_KEYS = new Set(["downside_triggers", "insights", "change_my_mind"]);

function isCited(o: Record<string, unknown>): o is { available: boolean; value: unknown; unit?: string } {
  return typeof (o as { available?: unknown }).available === "boolean" && "value" in o;
}

/**
 * Every "populated leaf" that the full report MUST surface: each available cited
 * value (formatted exactly as a cell would render it) plus each content string.
 * The coverage guard asserts every one of these appears in the rendered model.
 */
export function collectLeafSignatures(r: CompanyReport): { path: string; value: string }[] {
  const out: { path: string; value: string }[] = [];
  const seen = new Set<string>();
  const add = (path: string, value: string) => {
    const v = value.trim();
    if (!v || seen.has(path + "||" + v)) return;
    seen.add(path + "||" + v);
    out.push({ path, value: v });
  };
  const walk = (node: unknown, path: string, key: string) => {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) {
      if (STRING_ARRAY_KEYS.has(key)) node.forEach((it, i) => typeof it === "string" && add(`${path}[${i}]`, it));
      node.forEach((it, i) => walk(it, `${path}[${i}]`, key));
      return;
    }
    if (typeof node === "object") {
      const o = node as Record<string, unknown>;
      if (isCited(o)) {
        if (o.available && o.value !== null && o.value !== undefined) add(path, formatValue(o.value as number | string, o.unit));
        return;
      }
      for (const k of Object.keys(o)) {
        const v = o[k];
        if (typeof v === "string") {
          if (CONTENT_KEYS.has(k)) add(`${path}.${k}`, v);
        } else walk(v, `${path}.${k}`, k);
      }
    }
  };
  // Skip the top-level provenance spine (sources[]) — it is rendered verbatim and
  // its titles double as source labels, which would create noisy duplicate checks.
  for (const k of Object.keys(r) as (keyof CompanyReport)[]) {
    if (k === "sources") continue;
    walk(r[k], k, k);
  }
  return out;
}

/** All rendered text of a model — every cell, label, title, list item and note. */
export function flattenModelText(model: SectionModel[]): string {
  const bits: string[] = [];
  for (const sec of model) {
    bits.push(sec.title);
    if (sec.note) bits.push(sec.note);
    for (const ch of sec.charts) bits.push(ch.title);
    for (const part of sec.parts) {
      if ("title" in part && part.title) bits.push(part.title);
      if (part.kind === "kv") for (const row of part.rows) { bits.push(row.label, row.cell.text, ...row.cell.sources); }
      else if (part.kind === "table") { bits.push(...part.columns); for (const row of part.rows) for (const cell of row) bits.push(cell.text, ...cell.sources); }
      else if (part.kind === "list") bits.push(...part.items);
      else if (part.kind === "prose") bits.push(part.text);
      else if (part.kind === "note") bits.push(part.text);
    }
  }
  return bits.join("\n");
}
