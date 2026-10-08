import type { MnaSection } from "@/lib/types/report";
import { relevantPages } from "../text";
import { webResearch } from "../firecrawl";
import { citedSchema, extractSection, webBlock, type SectionCtx } from "./common";

const DEAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["target", "what"],
  properties: {
    date: { type: ["string", "null"] },
    target: { type: "string" },
    what: { type: "string" },
    deal_size: citedSchema("number"),
    payment: { type: "string" },
    rationale: { type: "string" },
    status: { type: "string" },
    source: { type: "string" },
    url: { type: ["string", "null"] },
    source_id: { type: "string" },
  },
};

const MNA_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["found", "deals"],
  properties: {
    found: { type: "boolean" },
    summary: { type: "string" },
    deals: { type: "array", items: DEAL_SCHEMA },
  },
};

export async function extractMna(ctx: SectionCtx): Promise<MnaSection> {
  const ar = relevantPages(
    ctx.harvest.annualReportText,
    ["acquisition", "acquire", "merger", "amalgamation", "subsidiary", "divestment", "stake", "joint venture"],
    ["business combination", "acquisition", "subsidiaries acquired", "scheme of amalgamation"],
    3,
    6000,
  );
  const web = await webResearch(`${ctx.company} ${ctx.ticker} acquisition merger M&A deal India last 3 years`);

  const evidence =
    [ar.text ? `ANNUAL REPORT (acquisitions / subsidiaries):\n${ar.text}` : ""]
      .filter(Boolean)
      .join("\n\n---\n\n") + webBlock(ctx, web.hits, web.text);

  const instruction =
    `Produce M&A / INORGANIC MOVES for ${ctx.company} (${ctx.ticker}), roughly the last 3 years.\n` +
    `- deals: each with date, target, what the target does, deal_size (INR cr, cited), payment (cash/stock/mixed), ` +
    `rationale, status (announced/completed/pending), and the source + url.\n` +
    `- If no material M&A is found in the evidence, set found=false, deals=[] and summary="No material M&A found." ` +
    `Never invent a deal or a deal size.`;

  return extractSection<MnaSection>({ ctx, instruction, evidence, schema: MNA_SCHEMA });
}
