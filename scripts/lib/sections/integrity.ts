import type { IntegritySection } from "@/lib/types/report";
import { relevantPages } from "../text";
import { extractSection, type SectionCtx } from "./common";

const CHECK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["check", "status"],
  properties: {
    check: { type: "string" },
    status: { enum: ["pass", "warn", "fail", "Not available"] },
    detail: { type: "string" },
  },
};

const INTEGRITY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["checks"],
  properties: {
    checks: { type: "array", items: CHECK_SCHEMA },
    coverage_note: { type: "string" },
  },
};

export async function extractIntegrity(ctx: SectionCtx): Promise<IntegritySection> {
  const consolidated = /\/consolidated\//.test(ctx.harvest.url);
  const resolvedName = ctx.harvest.name ?? "(not resolved)";
  const ar = relevantPages(
    ctx.harvest.annualReportText,
    ["restate", "restatement", "corporate action", "bonus", "split", "listing", "consolidated", "standalone"],
    ["restatement", "corporate actions", "listed on", "consolidated financial statements"],
    2,
    4000,
  );

  const meta =
    `KNOWN METADATA (for the gate):\n` +
    `- requested ticker: ${ctx.ticker}\n` +
    `- requested company name: ${ctx.company}\n` +
    `- Screener-resolved entity: ${resolvedName}\n` +
    `- Screener page: ${ctx.harvest.url} (${consolidated ? "CONSOLIDATED view" : "STANDALONE view"})\n`;

  const evidence = [meta, ar.text ? `ANNUAL REPORT (listing / restatements / corporate actions):\n${ar.text}` : "", ctx.harvest.screenerText ? `SCREENER:\n${ctx.harvest.screenerText.slice(0, 2500)}` : ""]
    .filter(Boolean)
    .join("\n\n---\n\n");

  const instruction =
    `Produce the INTEGRITY GATE for ${ctx.company} (${ctx.ticker}) — a data-trust checklist.\n` +
    `Return a checks[] array covering, each with status pass/warn/fail (or "Not available"):\n` +
    `  1. Issuer↔ticker match — does the Screener-resolved entity match the requested company/ticker?\n` +
    `  2. Primary listing — NSE/BSE listing confirmed?\n` +
    `  3. Consolidated vs standalone — which basis these figures use (${consolidated ? "consolidated" : "standalone"}).\n` +
    `  4. FY alignment — fiscal-year basis consistent (Indian Apr–Mar)?\n` +
    `  5. Restatements — any restatement of prior periods noted?\n` +
    `  6. Corporate actions — recent bonus/split/buyback that affects per-share figures?\n` +
    `- coverage_note: one line on overall data confidence and any gaps. Base every status on the evidence.`;

  return extractSection<IntegritySection>({ ctx, instruction, evidence, schema: INTEGRITY_SCHEMA, maxTokens: 1800 });
}
