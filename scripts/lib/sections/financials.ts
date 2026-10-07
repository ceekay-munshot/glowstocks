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
    `EBITDA margin, PAT, PAT margin, OCF, FCF, net_debt (negative = net cash), ROCE, ROE, and any ` +
    `one_offs noted.\n` +
    `- latest_fy: the most recent full year (period_type "annual"), same fields.\n` +
    `- history: the last 5 financial years, OLDEST FIRST, each with revenue, EBITDA, EBITDA margin, ` +
    `PAT, PAT margin, EPS. Mark anything the evidence doesn't contain as available:false (never guess).`;

  return extractSection<FinancialsSection>({
    ctx,
    instruction,
    evidence,
    schema: FINANCIALS_SCHEMA,
  });
}
