import type { FinancialsSection } from "@/lib/types/report";
import { relevantPages } from "../text";
import { citedSchema, extractSection, type SectionCtx } from "./common";

const n = () => citedSchema("number");

const PERIOD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["period", "period_type", "revenue", "pat"],
  properties: {
    period: { type: "string" },
    period_type: { enum: ["quarter", "annual"] },
    revenue: n(),
    ebitda: n(),
    ebitda_margin: n(),
    ebit: n(),
    ebit_margin: n(),
    pat: n(),
    pat_margin: n(),
    ocf: n(),
    fcf: n(),
    net_debt: n(),
    roce: n(),
    roe: n(),
    one_offs: { type: "string" },
  },
};

const YEAR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["period", "revenue", "pat"],
  properties: {
    period: { type: "string" },
    revenue: n(),
    ebitda: n(),
    ebitda_margin: n(),
    pat: n(),
    pat_margin: n(),
    eps: n(),
    ocf: n(),
    fcf: n(),
    net_debt: n(),
    roce: n(),
    roe: n(),
  },
};

const FINANCIALS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["history"],
  properties: {
    latest_quarter: PERIOD_SCHEMA,
    latest_fy: PERIOD_SCHEMA,
    history: { type: "array", items: YEAR_SCHEMA },
  },
};

export async function extractFinancials(ctx: SectionCtx): Promise<FinancialsSection> {
  const finPages = relevantPages(
    ctx.harvest.annualReportText,
    ["revenue", "ebitda", "profit", "cash flow", "borrowings", "return on"],
    ["statement of profit and loss", "cash flow statement", "return on capital employed"],
    4,
    8000,
  );
  const evidence = [
    `SCREENER (P&L, quarters, cash flow, ratios — INR cr):\n${ctx.harvest.screenerText}`,
    finPages.text ? `ANNUAL REPORT (financial statements):\n${finPages.text}` : "",
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");

  const instruction =
    `Produce FINANCIALS for ${ctx.company} (${ctx.ticker}). All money in INR crore; margins and ` +
    `returns in %. Cite every datum to Screener or the annual report.\n` +
    `- latest_quarter: the most recent reported quarter (period_type "quarter"): revenue, EBITDA, ` +
    `EBITDA margin, PAT, PAT margin, OCF, FCF, net_debt, ROCE, ROE, and any one_offs noted.\n` +
    `- latest_fy: the most recent full year (period_type "annual"), same fields.\n` +
    `- net_debt = total borrowings MINUS (cash & bank + current/liquid investments & treasury); a ` +
    `NEGATIVE value means NET CASH. COMPUTE it from the balance sheet whenever those lines are present ` +
    `(use the fact sheet's net cash/debt figure where given). A cash-rich IT-services firm is net cash ` +
    `(negative) — do NOT mark it Not available when the balance sheet shows borrowings, cash & investments.\n` +
    `- history: the FULL annual trend Screener shows (up to the last 10 financial years), OLDEST ` +
    `FIRST. For EACH year give revenue, EBITDA, EBITDA margin, PAT, PAT margin, EPS AND the annual ` +
    `cash-flow & returns — ocf (Cash from Operating Activity), fcf (Free Cash Flow), net_debt ` +
    `(borrowings − cash & investments; negative = net cash), roce (ROCE %) and roe (ROE %) — reading ` +
    `straight DOWN Screener's Cash Flow and Ratios tables year by year. These are the TREND the user ` +
    `wants, so fill every year Screener provides; mark only genuinely-absent cells available:false.`;

  return extractSection<FinancialsSection>({
    ctx,
    instruction,
    evidence,
    schema: FINANCIALS_SCHEMA,
  });
}
