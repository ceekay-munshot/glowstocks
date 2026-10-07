// Shared machinery for the per-section extractors. Each section is one strict,
// schema-validated, CITATION-BACKED model call. The heavy shared prefix (the
// fact sheet + the known-source menu) goes in the cached system block so the five
// section calls reuse it (Bedrock prompt caching) instead of re-paying for it.

import { completeJSON } from "../bedrock";
import type { HarvestResult } from "../harvest";
import type { SourceCollector } from "../sources";
import type { FcHit } from "../firecrawl";

export const CITED_SYSTEM =
  "You are a precise equity-research extraction engine for INDIAN listed companies " +
  "(NSE/BSE). Extract ONLY what the evidence supports. NEVER guess, estimate, or " +
  'infer a figure: if the evidence does not contain a value, set that datum\'s ' +
  '"available" to false and "value" to null. Money is in INR crore; percentages are ' +
  "0–100; valuation multiples are plain numbers (a P/E of 24.5 is 24.5). For every " +
  "data point you MARK available, cite the specific source: set source to one of the " +
  "KNOWN SOURCES titles, date to the source's date (ISO or label), locator to the " +
  "exact spot (p.N / slide N / section name), and url to that source's url.";

/** JSON-schema fragment for a Cited<number> / Cited<string> / Cited<both>. */
export function citedSchema(valueType: "number" | "string" | "both" = "number") {
  const value =
    valueType === "both"
      ? { type: ["number", "string", "null"] }
      : valueType === "string"
        ? { type: ["string", "null"] }
        : { type: ["number", "null"] };
  return {
    type: "object",
    additionalProperties: false,
    required: ["value", "available"],
    properties: {
      value,
      available: { type: "boolean" },
      unit: { type: "string" },
      source: { type: "string" },
      date: { type: ["string", "null"] },
      locator: { type: ["string", "null"] },
      url: { type: ["string", "null"] },
      source_id: { type: "string" },
      note: { type: "string" },
    },
  };
}

export interface SectionCtx {
  company: string;
  ticker: string;
  harvest: HarvestResult;
  /** The verified fact-sheet preamble (shared, cached across section calls). */
  facts: string;
  collector: SourceCollector;
}

/** Run one section extraction: strict JSON, cached shared context, auto-cited. */
export async function extractSection<T>(args: {
  ctx: SectionCtx;
  instruction: string;
  evidence: string;
  schema: object;
  maxTokens?: number;
}): Promise<T> {
  const { ctx } = args;
  const system =
    CITED_SYSTEM +
    (ctx.facts ? `\n\n${ctx.facts}` : "") +
    `\n\nKNOWN SOURCES (cite by these titles; set each datum's url to the source url):\n${ctx.collector.menu()}`;

  const prompt = `${args.instruction}\n\nEVIDENCE (use ONLY this — cite precisely, never guess):\n${args.evidence}`;

  const out = await completeJSON<T>(
    { prompt, system, maxTokens: args.maxTokens ?? 2200, temperature: 0.1, cacheSystem: true },
    args.schema,
  );
  // Register every cited url + stamp source_id onto each cited datum.
  ctx.collector.attach(out);
  return out;
}

/** Register web hits as sources and render them as an evidence suffix. */
export function webBlock(ctx: SectionCtx, hits: FcHit[], text: string): string {
  for (const h of hits) ctx.collector.addHit(h);
  return text ? `\n\n--- WEB RESEARCH ---\n${text}` : "";
}
