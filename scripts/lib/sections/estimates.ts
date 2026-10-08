import type { EstimatesSection } from "@/lib/types/report";
import { webResearch } from "../firecrawl";
import { citedSchema, extractSection, webBlock, type SectionCtx } from "./common";

const EYEAR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["period"],
  properties: {
    period: { type: "string" },
    revenue: citedSchema("number"),
    eps: citedSchema("number"),
    growth: citedSchema("number"),
  },
};

const ESTIMATES_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["available", "forward"],
  properties: {
    available: { type: "boolean" },
    summary: { type: "string" },
    forward: { type: "array", items: EYEAR_SCHEMA },
    eps_revision: { type: "string" },
    target_low: citedSchema("number"),
    target_mean: citedSchema("number"),
    target_high: citedSchema("number"),
    rating: citedSchema("both"),
    analysts: citedSchema("number"),
  },
};

export async function extractEstimates(ctx: SectionCtx): Promise<EstimatesSection> {
  // Street estimates live on the web (Trendlyne / Yahoo / broker notes), not in filings.
  const web = await webResearch(
    `${ctx.company} ${ctx.ticker} analyst estimates consensus EPS revenue forecast price target FY26 FY27 Trendlyne`,
  );

  if (!web.text) {
    return { available: false, summary: "No Street estimates found via web research.", forward: [] };
  }

  const evidence = webBlock(ctx, web.hits, web.text);

  const instruction =
    `Produce STREET ESTIMATES for ${ctx.company} (${ctx.ticker}) from the web evidence ONLY.\n` +
    `- forward: the next 2–3 forward years (e.g. FY26E, FY27E) with consensus revenue (INR cr), EPS (INR) and ` +
    `growth (%), each cited to the source.\n` +
    `- eps_revision: the EPS revision trend (upgrades / flat / downgrades) if stated.\n` +
    `- target_low / target_mean / target_high: the analyst price-target range (INR).\n` +
    `- rating: consensus rating/label; analysts: number of analysts covering.\n` +
    `- Be CONSERVATIVE: if the evidence is thin, set available=false or mark individual fields available:false. ` +
    `Never fabricate an estimate.`;

  return extractSection<EstimatesSection>({ ctx, instruction, evidence, schema: ESTIMATES_SCHEMA });
}
