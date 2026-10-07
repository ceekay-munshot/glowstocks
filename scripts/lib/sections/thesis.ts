import type { ThesisSection } from "@/lib/types/report";
import { relevantPages } from "../text";
import { webResearch } from "../firecrawl";
import { citedSchema, extractSection, webBlock, type SectionCtx } from "./common";

const n = () => citedSchema("number");

const POINT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["text"],
  properties: {
    text: { type: "string" },
    source: { type: "string" },
    url: { type: ["string", "null"] },
    source_id: { type: "string" },
  },
};

const SCENARIO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name"],
  properties: {
    name: { type: "string" },
    probability: n(),
    target_price: n(),
    upside: n(),
    revenue_cagr: n(),
    margin: n(),
    pe_exit: n(),
    narrative: { type: "string" },
  },
};

const THESIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["stance", "supports", "counters", "change_my_mind", "scenarios"],
  properties: {
    stance: { enum: ["BUY", "HOLD", "SELL", "Not available"] },
    supports: { type: "array", items: POINT_SCHEMA },
    counters: { type: "array", items: POINT_SCHEMA },
    change_my_mind: { type: "array", items: { type: "string" } },
    scenarios: { type: "array", items: SCENARIO_SCHEMA },
  },
};

export async function extractThesis(ctx: SectionCtx): Promise<ThesisSection> {
  const concall = ctx.harvest.documents.find((d) => d.kind === "concall");
  const commentary = concall
    ? relevantPages(
        concall.text,
        ["growth", "margin", "demand", "guidance", "outlook", "order", "capex"],
        ["management commentary", "guidance", "outlook", "order book"],
        3,
        6000,
      )
    : { text: "", pages: [] };

  const web = await webResearch(
    `${ctx.company} ${ctx.ticker} investment thesis analyst view growth outlook risks India`,
  );

  const evidence =
    [
      ctx.harvest.screenerText ? `SCREENER:\n${ctx.harvest.screenerText.slice(0, 5000)}` : "",
      commentary.text ? `CONCALL (${concall?.name}):\n${commentary.text}` : "",
    ]
      .filter(Boolean)
      .join("\n\n---\n\n") + webBlock(ctx, web.hits, web.text);

  const instruction =
    `Produce the INVESTMENT THESIS for ${ctx.company} (${ctx.ticker}).\n` +
    `- stance: BUY / HOLD / SELL consistent with the Snapshot.\n` +
    `- supports: 3–5 bull points; counters: 3–5 bear points. Each a crisp sentence; cite one to a ` +
    `source (concall / filing / web) where the evidence supports it.\n` +
    `- change_my_mind: 2–4 concrete, measurable thresholds that would flip the view ` +
    `(e.g. "EBITDA margin below 18% for two quarters").\n` +
    `- scenarios: exactly three rows named "Bear", "Base", "Bull". These are YOUR reasoned analyst ` +
    `estimates grounded in the fact sheet — set each figure's source to "glowstocks estimate", ` +
    `available:true, and put the key assumption in note/narrative. Provide probability (%), ` +
    `revenue_cagr (%), margin (%), pe_exit (x), target_price (INR) and upside (%) where you can ` +
    `reason them; mark a cell available:false only if you truly cannot.`;

  return extractSection<ThesisSection>({
    ctx,
    instruction,
    evidence,
    schema: THESIS_SCHEMA,
    maxTokens: 2800,
  });
}
