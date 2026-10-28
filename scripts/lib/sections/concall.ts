import type { ConcallSection } from "@/lib/types/report";
import { relevantPages } from "../text";
import { webResearch } from "../firecrawl";
import { extractSection, webBlock, type SectionCtx } from "./common";

const HIGHLIGHT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["theme", "quote", "speaker"],
  properties: {
    theme: { type: "string" },
    quote: { type: "string" },
    speaker: { type: "string" },
    date: { type: ["string", "null"] },
    source: { type: "string" },
    url: { type: ["string", "null"] },
    source_id: { type: "string" },
  },
};

const CONCALL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["available", "highlights", "insights"],
  properties: {
    available: { type: "boolean" },
    period: { type: "string" },
    date: { type: ["string", "null"] },
    highlights: { type: "array", items: HIGHLIGHT_SCHEMA },
    insights: { type: "array", items: { type: "string" } },
    tone: { type: "string" },
  },
};

export async function extractConcall(ctx: SectionCtx): Promise<ConcallSection> {
  const concall = ctx.harvest.documents.find((d) => d.kind === "concall");

  // Primary path: a transcript was harvested from Screener → extract from it.
  if (concall && concall.text) {
    const picked = relevantPages(
      concall.text,
      ["growth", "margin", "demand", "guidance", "outlook", "order", "deal", "capex", "pricing", "attrition"],
      ["management commentary", "guidance", "outlook", "we expect", "order book", "deal pipeline"],
      6,
      12000,
    );

    const instruction =
      `Produce CONCALL HIGHLIGHTS for ${ctx.company} (${ctx.ticker}) from the transcript "${concall.name}".\n` +
      `- available: true.\n` +
      `- period/date: the concall period and date if evident.\n` +
      `- highlights: 5–8 items, each with a theme, an EXACT quote from the transcript, the speaker (name/role), ` +
      `and the date. Set source to "${concall.name}" and url to its source url.\n` +
      `- insights: exactly 5 "so what" takeaways (what each theme means for the investment).\n` +
      `- tone: one line on management tone / guidance posture. Use ONLY the transcript; never invent a quote.`;

    return extractSection<ConcallSection>({
      ctx,
      instruction,
      evidence: `CONCALL TRANSCRIPT (${concall.name}, url ${concall.url ?? "n/a"}):\n${picked.text}`,
      schema: CONCALL_SCHEMA,
    });
  }

  // Fallback: Screener had no downloadable transcript this quarter → search the web
  // for the latest earnings-call transcript / summary and extract from that.
  const web = await webResearch(
    `${ctx.company} ${ctx.ticker} latest quarter earnings call concall transcript management commentary highlights`,
  );
  if (!web.text) {
    return { available: false, highlights: [], insights: [], tone: "No concall transcript was found." };
  }

  const instruction =
    `Produce CONCALL HIGHLIGHTS for ${ctx.company} (${ctx.ticker}) from the WEB evidence below, which is a ` +
    `recent earnings-call transcript or summary.\n` +
    `- available: true ONLY if the evidence is clearly this company's earnings call; otherwise false.\n` +
    `- period/date: the concall period and date if evident.\n` +
    `- highlights: 5–8 items, each with a theme, a quote faithful to the evidence, the speaker (name/role) and ` +
    `the date. Set source + url to the specific web source each quote comes from.\n` +
    `- insights: up to 5 "so what" takeaways.\n` +
    `- tone: one line on management tone / guidance posture. Use ONLY the evidence; never invent a quote.`;

  return extractSection<ConcallSection>({
    ctx,
    instruction,
    evidence: webBlock(ctx, web.hits, web.text),
    schema: CONCALL_SCHEMA,
  });
}
