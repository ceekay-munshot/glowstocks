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
  // M&A lives mostly on the web (press releases, deal trackers), not in filings —
  // two targeted searches: the deal history + the most recent named deals.
  const [general, recent] = await Promise.all([
    webResearch(`${ctx.company} ${ctx.ticker} acquisitions mergers divestitures joint ventures India list of deals history`),
    webResearch(`${ctx.company} ${ctx.ticker} acquired acquires latest deal 2024 2025 2026 announcement amount`),
  ]);

  const evidence =
    [ar.text ? `ANNUAL REPORT (acquisitions / subsidiaries):\n${ar.text}` : ""]
      .filter(Boolean)
      .join("\n\n---\n\n") + webBlock(ctx, general.hits, general.text) + webBlock(ctx, recent.hits, recent.text);

  const instruction =
    `Produce M&A / INORGANIC MOVES for ${ctx.company} (${ctx.ticker}) over roughly the last 3–4 years, using BOTH ` +
    `the annual report AND the web evidence.\n` +
    `- deals: list EVERY acquisition, merger, divestiture, strategic stake or material joint venture you can find — ` +
    `each with date, target, what the target does, deal_size (INR cr, cited — mark available:false if the amount ` +
    `wasn't disclosed), payment (cash/stock/mixed), rationale, status (announced/completed/pending), and the source + url.\n` +
    `- Prefer named, dated deals. Do NOT drop a real deal just because its size is undisclosed — include it with ` +
    `deal_size available:false.\n` +
    `- Only if NO material inorganic activity exists at all, set found=false, deals=[] and summary="No material M&A found." ` +
    `Never invent a deal or a deal size.`;

  return extractSection<MnaSection>({ ctx, instruction, evidence, schema: MNA_SCHEMA });
}
