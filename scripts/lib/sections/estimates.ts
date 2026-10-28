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
  // Street estimates + price targets live on the web (Trendlyne Forecaster and other
  // public consensus pages), not in filings. Two targeted searches — one for the
  // EPS/revenue estimates, one for the price-target consensus — run together; the
  // run-level scrape cache bills a URL surfaced by both only once.
  const [est, tgt] = await Promise.all([
    webResearch(
      `${ctx.company} ${ctx.ticker} consensus EPS revenue estimates forecast FY26 FY27 FY28 Trendlyne forecaster analyst`,
    ),
    webResearch(
      `${ctx.company} ${ctx.ticker} share price target consensus analyst Trendlyne forecaster high low average target rating buy sell`,
    ),
  ]);

  if (!est.text && !tgt.text) {
    return { available: false, summary: "No Street estimates found via web research.", forward: [] };
  }

  const evidence = webBlock(ctx, est.hits, est.text) + webBlock(ctx, tgt.hits, tgt.text);

  const instruction =
    `Produce STREET ESTIMATES for ${ctx.company} (${ctx.ticker}) from the web evidence ONLY.\n` +
    `- forward: the next 2–3 forward years (e.g. FY26E, FY27E) with consensus revenue (INR cr), EPS (INR) and ` +
    `growth (%), each cited to the source.\n` +
    `- eps_revision: the EPS revision trend (upgrades / flat / downgrades) if stated.\n` +
    `- target_low / target_mean / target_high: the analyst price-target range (INR) from the Forecaster / ` +
    `consensus page — fill each one you find; mark only the genuinely missing ones available:false.\n` +
    `- rating: consensus rating/label (e.g. "Buy", "Strong Buy"); analysts: number of analysts covering.\n` +
    `- Be CONSERVATIVE: if the evidence is thin, set available=false or mark individual fields available:false. ` +
    `Never fabricate an estimate.`;

  return extractSection<EstimatesSection>({ ctx, instruction, evidence, schema: ESTIMATES_SCHEMA });
}
