import type { GrowthSection } from "@/lib/types/report";
import { relevantPages } from "../text";
import { webResearch } from "../firecrawl";
import { citedSchema, extractSection, webBlock, type SectionCtx } from "./common";

const DRIVER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "detail", "direction"],
  properties: {
    name: { type: "string" },
    detail: { type: "string" },
    metric: citedSchema("number"),
    direction: { enum: ["tailwind", "headwind", "neutral", "Not available"] },
  },
};

const CATALYST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["catalyst", "timing", "kpi"],
  properties: {
    catalyst: { type: "string" },
    timing: { type: "string" },
    kpi: { type: "string" },
    confirms: { type: "string" },
    falsifies: { type: "string" },
  },
};

const GROWTH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["drivers", "catalysts", "downside_triggers"],
  properties: {
    summary: { type: "string" },
    drivers: { type: "array", items: DRIVER_SCHEMA },
    catalysts: { type: "array", items: CATALYST_SCHEMA },
    downside_triggers: { type: "array", items: { type: "string" } },
  },
};

export async function extractGrowth(ctx: SectionCtx): Promise<GrowthSection> {
  const concall = ctx.harvest.documents.find((d) => d.kind === "concall");
  const concallText = concall
    ? relevantPages(concall.text, ["growth", "guidance", "outlook", "demand", "margin", "order", "capex", "pricing", "volume"], ["guidance", "outlook", "growth drivers", "order pipeline"], 3, 6000).text
    : "";
  const ar = relevantPages(
    ctx.harvest.annualReportText,
    ["growth", "strategy", "outlook", "expansion", "capacity", "export", "new product", "capex"],
    ["growth strategy", "management discussion", "outlook", "capital expenditure"],
    3,
    6000,
  );
  const web = await webResearch(`${ctx.company} ${ctx.ticker} growth drivers outlook guidance catalysts FY India`);

  const evidence =
    [
      concallText ? `CONCALL (${concall?.name}):\n${concallText}` : "",
      ar.text ? `ANNUAL REPORT (strategy / outlook):\n${ar.text}` : "",
    ]
      .filter(Boolean)
      .join("\n\n---\n\n") + webBlock(ctx, web.hits, web.text);

  const instruction =
    `Produce the GROWTH analysis for ${ctx.company} (${ctx.ticker}).\n` +
    `- drivers: up to 8 growth drivers spanning pricing, volumes, capacity, margins, order wins, new products, ` +
    `exports, capex and working capital. Each: a crisp detail with the number/guidance where stated, an optional ` +
    `quantified metric (cited), and direction (tailwind / headwind / neutral).\n` +
    `- catalysts: 3–5 forward catalysts, each with timing, the KPI to watch, and what would confirm vs falsify it.\n` +
    `- downside_triggers: 3–5 concrete bear-case triggers. Mark any metric the evidence doesn't support as ` +
    `available:false (never guess a figure).`;

  return extractSection<GrowthSection>({ ctx, instruction, evidence, schema: GROWTH_SCHEMA, maxTokens: 2800 });
}
