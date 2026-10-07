/**
 * glowstocks v1 DATA CONTRACT.
 *
 * The single source of truth shared by BOTH the research engine (scripts/, which
 * WRITES data/companies/<TICKER>.json) and the dashboard (src/, which RENDERS it).
 * Pure types only — no runtime exports — so the engine can import it under tsx
 * without dragging any app code into the Worker bundle.
 *
 * GUARDRAIL — every data point is CITATION-BACKED and never guessed. A figure the
 * sources don't contain is encoded as { value: null, available: false } and shown
 * as "Not available". Each datum carries its own source / date / locator / url, so
 * the UI can show provenance on hover (the citation-tooltip pattern).
 */

/** Where a citation points. */
export type SourceType =
  | "annual_report"
  | "concall"
  | "investor_presentation"
  | "exchange_filing"
  | "screener"
  | "web"
  | "news"
  | "estimate"
  | "other";

/**
 * A single cited data point. Matches the brief's example shape exactly:
 *   { value, unit, source, date, locator, url }
 * plus an explicit `available` flag so "Not available" is unambiguous (never a
 * guessed 0 or "", never a silently-dropped field).
 */
export interface Cited<T = number> {
  /** The figure/text, or null when not available. */
  value: T | null;
  /** True when the sources actually provided this; false => "Not available". */
  available: boolean;
  /** e.g. "INR cr", "%", "x", "INR", "ratio". */
  unit?: string;
  /** Human label of the source, e.g. "Annual Report FY24", "Concall Q1 FY25". */
  source?: string;
  /** ISO date or label of the source; null when unknown. */
  date?: string | null;
  /** In-source locator, e.g. "p.147", "slide 12", "min 23:40". */
  locator?: string | null;
  /** Deep link to the source document/page. */
  url?: string | null;
  /** Id of the matching row in `sources[]` (for deep-linking the Sources panel). */
  source_id?: string;
  /** Optional qualifier, e.g. "ex one-off gain". */
  note?: string;
}

/** A cited number/string with a display label (used for KPI tiles). */
export interface Metric extends Cited<number | string> {
  label: string;
  /** Optional signed change vs a named period, for KPI trend chips. */
  delta?: Delta | null;
}

export interface Delta {
  value: number;
  unit?: string;
  period?: string;
  /** Whether an up-move is good (direction × sentiment drives the color). */
  good?: boolean | null;
}

export type Stance = "BUY" | "HOLD" | "SELL" | "Not available";
export type Trend = "growing" | "shrinking" | "stable" | "Not available";

/* ------------------------------------------------------------------ snapshot */

export interface SnapshotSection {
  /** 2–4 line business model. */
  business_model: string;
  stance: Stance;
  stance_rationale?: string;
  sector?: string;
  industry?: string;
  /** Headline KPIs (each individually cited). */
  kpis: Metric[];
}

/* ------------------------------------------------------------------ business */

export interface Segment {
  name: string;
  /** % of revenue. */
  pct_revenue: Cited<number>;
  /** Optional absolute revenue (INR cr). */
  revenue?: Cited<number>;
  trend: Trend;
  note?: string;
}

export interface Geography {
  region: string;
  pct_revenue: Cited<number>;
  /** Growth driver. */
  driver?: string;
  /** Key risk. */
  risk?: string;
}

export interface BusinessSection {
  summary?: string;
  segments: Segment[];
  geographies: Geography[];
}

/* ---------------------------------------------------------------- financials */

/** A detailed period (latest quarter / latest FY). */
export interface PeriodFinancials {
  period: string;
  period_type: "quarter" | "annual";
  revenue: Cited<number>;
  ebitda?: Cited<number>;
  ebitda_margin?: Cited<number>;
  ebit?: Cited<number>;
  ebit_margin?: Cited<number>;
  pat: Cited<number>;
  pat_margin?: Cited<number>;
  ocf?: Cited<number>;
  fcf?: Cited<number>;
  /** Net debt; negative value means net cash. */
  net_debt?: Cited<number>;
  roce?: Cited<number>;
  roe?: Cited<number>;
  one_offs?: string;
}

/** A compact year row for the 5-year history chart. */
export interface FinancialYear {
  period: string;
  revenue: Cited<number>;
  ebitda?: Cited<number>;
  ebitda_margin?: Cited<number>;
  pat: Cited<number>;
  pat_margin?: Cited<number>;
  eps?: Cited<number>;
}

export interface FinancialsSection {
  latest_quarter?: PeriodFinancials;
  latest_fy?: PeriodFinancials;
  /** Up to ~5 years, oldest first. */
  history: FinancialYear[];
}

/* --------------------------------------------------------------------- peers */

export interface Peer {
  name: string;
  ticker?: string;
  /** True for the subject company's own row, so the UI can highlight it. */
  is_self?: boolean;
  price?: Cited<number>;
  mcap?: Cited<number>;
  pe?: Cited<number>;
  ev_ebitda?: Cited<number>;
  roe?: Cited<number>;
  roce?: Cited<number>;
  roa?: Cited<number>;
  sales_growth_5y?: Cited<number>;
  profit_growth_5y?: Cited<number>;
  /** Debt / equity (x). */
  de?: Cited<number>;
}

export interface PeersSection {
  peers: Peer[];
  note?: string;
}

/* -------------------------------------------------------------------- thesis */

export interface ThesisPoint {
  text: string;
  source?: string;
  url?: string | null;
  source_id?: string;
}

export interface Scenario {
  name: "Bear" | "Base" | "Bull" | string;
  probability?: Cited<number>;
  target_price?: Cited<number>;
  upside?: Cited<number>;
  revenue_cagr?: Cited<number>;
  margin?: Cited<number>;
  pe_exit?: Cited<number>;
  narrative?: string;
}

export interface ThesisSection {
  stance: Stance;
  supports: ThesisPoint[];
  counters: ThesisPoint[];
  /** Thresholds that would flip the view ("change my mind"). */
  change_my_mind: string[];
  scenarios: Scenario[];
}

/* ------------------------------------------------------------------- sources */

export interface SourceRef {
  /** Stable id referenced by `Cited.source_id` / `ThesisPoint.source_id`. */
  id: string;
  title: string;
  type: SourceType;
  date: string | null;
  locator?: string | null;
  url: string | null;
}

/* ----------------------------------------------------------------- coverage */

/** Which sections the engine actually filled (drives partial-data UI + refresh). */
export interface ReportCoverage {
  snapshot: boolean;
  business: boolean;
  financials: boolean;
  peers: boolean;
  thesis: boolean;
  /** Harvest notes / degradations (logged-out scrape, missing AR, …). */
  notes?: string;
}

/* ------------------------------------------------------------- report envelope */

export interface CompanyReport {
  /** Bump when the contract changes; the UI tolerates older minor shapes. */
  schemaVersion: number;
  ticker: string;
  company: string;
  exchange: string;
  /** Country is always India in v1. */
  country: "India";
  currency: "INR";
  /** As-of date of the underlying data. */
  as_of: string;
  /** ISO timestamp of the last engine run (drives incremental refresh). */
  last_updated: string;
  units_note?: string;
  generated_by?: string;
  is_sample?: boolean;
  coverage: ReportCoverage;

  snapshot: SnapshotSection;
  business: BusinessSection;
  financials: FinancialsSection;
  peers: PeersSection;
  thesis: ThesisSection;
  sources: SourceRef[];

  /**
   * Persistent cost cache: every URL already scraped across all runs for this
   * company. The engine NEVER re-scrapes a URL already in this list — read-once.
   */
  sources_seen?: string[];
}

/** The ordered section keys (also the dashboard tab order). */
export const SECTION_KEYS = [
  "snapshot",
  "business",
  "financials",
  "peers",
  "thesis",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];
