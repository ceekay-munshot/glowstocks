import type { ConcallSection } from "@/lib/types/report";
import { relevantPages } from "../text";
import { extractSection, type SectionCtx } from "./common";

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
  // No transcript harvested → "Not available" without burning a model call.
  if (!concall || !concall.text) {
    return { available: false, highlights: [], insights: [], tone: "No concall transcript was harvested." };
  }

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
    maxTokens: 2800,
  });
}
