import type { SnapshotSection } from "@/lib/types/report";
import { relevantPages } from "../text";
import { extractSection, type SectionCtx } from "./common";

const KPI_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["label", "value", "available"],
  properties: {
    label: { type: "string" },
    value: { type: ["number", "string", "null"] },
    available: { type: "boolean" },
    unit: { type: "string" },
    source: { type: "string" },
    date: { type: ["string", "null"] },
    locator: { type: ["string", "null"] },
    url: { type: ["string", "null"] },
    source_id: { type: "string" },
    note: { type: "string" },
    delta: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: {
        value: { type: "number" },
        unit: { type: "string" },
        period: { type: "string" },
        good: { type: ["boolean", "null"] },
      },
    },
  },
};

const SNAPSHOT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["business_model", "stance", "kpis"],
  properties: {
    business_model: { type: "string" },
    stance: { enum: ["BUY", "HOLD", "SELL", "Not available"] },
    stance_rationale: { type: "string" },
    sector: { type: "string" },
    industry: { type: "string" },
    kpis: { type: "array", items: KPI_SCHEMA },
  },
};

export async function extractSnapshot(ctx: SectionCtx): Promise<SnapshotSection> {
  const about = relevantPages(
    ctx.harvest.annualReportText,
    ["business", "operations", "overview", "segment", "products", "services", "about"],
    ["business overview", "management discussion", "about the company", "our business"],
    4,
    8000,
  );
  const evidence = [
    `SCREENER (ratios & financials):\n${ctx.harvest.screenerText}`,
    about.text ? `ANNUAL REPORT (business overview):\n${about.text}` : "",
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");

  const instruction =
    `Produce the SNAPSHOT for ${ctx.company} (${ctx.ticker}).\n` +
    `- business_model: 2–4 plain sentences on what the company does and how it makes money.\n` +
    `- sector, industry.\n` +
    `- stance: your overall view (BUY / HOLD / SELL) grounded in valuation, growth and quality; ` +
    `"Not available" only if you genuinely cannot form one. stance_rationale: one sentence.\n` +
    `- kpis: 6–8 headline KPIs, each individually cited. Prefer: Market cap (INR cr), Price (INR), ` +
    `Revenue latest FY (INR cr), Revenue growth YoY (%), EBITDA margin (%), PAT (INR cr), P/E (x), ` +
    `ROE (%), Promoter holding (%). Use the fact sheet figures verbatim where present. Mark any KPI ` +
    `the evidence doesn't support as available:false. Set a delta only when the evidence gives a ` +
    `clear period-over-period change.`;

  return extractSection<SnapshotSection>({
    ctx,
    instruction,
    evidence,
    schema: SNAPSHOT_SCHEMA,
  });
}
