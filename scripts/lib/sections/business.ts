import type { BusinessSection } from "@/lib/types/report";
import { relevantPages } from "../text";
import { webResearch } from "../firecrawl";
import { citedSchema, extractSection, webBlock, type SectionCtx } from "./common";

const SEGMENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "pct_revenue", "trend"],
  properties: {
    name: { type: "string" },
    pct_revenue: citedSchema("number"),
    revenue: citedSchema("number"),
    trend: { enum: ["growing", "shrinking", "stable", "Not available"] },
    note: { type: "string" },
  },
};

const GEO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["region", "pct_revenue"],
  properties: {
    region: { type: "string" },
    pct_revenue: citedSchema("number"),
    driver: { type: "string" },
    risk: { type: "string" },
  },
};

const BUSINESS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["segments", "geographies"],
  properties: {
    summary: { type: "string" },
    segments: { type: "array", items: SEGMENT_SCHEMA },
    geographies: { type: "array", items: GEO_SCHEMA },
  },
};

export async function extractBusiness(ctx: SectionCtx): Promise<BusinessSection> {
  const segPages = relevantPages(
    ctx.harvest.annualReportText,
    ["segment", "geograph", "revenue", "region", "vertical", "business"],
    ["segment reporting", "segment revenue", "geographical", "revenue by", "business segments"],
    5,
    9000,
  );

  // The AR usually carries segment splits; geography sometimes needs the web.
  const web = await webResearch(
    `${ctx.company} revenue breakdown by segment and geography percentage ${ctx.ticker} India`,
  );

  const evidence =
    [
      segPages.text ? `ANNUAL REPORT (segments / geography):\n${segPages.text}` : "",
      ctx.harvest.screenerText ? `SCREENER:\n${ctx.harvest.screenerText.slice(0, 6000)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n---\n\n") + webBlock(ctx, web.hits, web.text);

  const instruction =
    `Produce the BUSINESS breakdown for ${ctx.company} (${ctx.ticker}).\n` +
    `- summary: one line on the revenue mix.\n` +
    `- segments: each reported business segment with pct_revenue (% of total revenue, cited), ` +
    `optional absolute revenue (INR cr), and trend (growing / shrinking / stable) from the ` +
    `evidence. The percentages should sum to ~100.\n` +
    `- geographies: operating geographies with pct_revenue (cited), a growth driver and a key risk. ` +
    `Mark anything unsupported as available:false (never guess a split).`;

  return extractSection<BusinessSection>({
    ctx,
    instruction,
    evidence,
    schema: BUSINESS_SCHEMA,
    maxTokens: 2400,
  });
}
