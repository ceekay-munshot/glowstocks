import type { RisksSection } from "@/lib/types/report";
import { relevantPages } from "../text";
import { webResearch } from "../firecrawl";
import { citedSchema, extractSection, webBlock, type SectionCtx } from "./common";

const LEVELS = ["Low", "Medium", "High", "Not available"];

const RISK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["risk", "severity", "probability"],
  properties: {
    risk: { type: "string" },
    evidence: { type: "string" },
    transmission: { type: "string" },
    severity: { enum: LEVELS },
    probability: { enum: LEVELS },
    leading_indicators: { type: "string" },
    mitigants: { type: "string" },
  },
};

const DOWNSIDE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "trigger"],
  properties: {
    name: { type: "string" },
    trigger: { type: "string" },
    impact: { type: "string" },
    probability: citedSchema("number"),
  },
};

const RISKS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["register", "downside_scenarios"],
  properties: {
    summary: { type: "string" },
    register: { type: "array", items: RISK_SCHEMA },
    downside_scenarios: { type: "array", items: DOWNSIDE_SCHEMA },
  },
};

export async function extractRisks(ctx: SectionCtx): Promise<RisksSection> {
  const ar = relevantPages(
    ctx.harvest.annualReportText,
    ["risk", "uncertainty", "exposure", "litigation", "contingent", "regulatory", "concentration", "currency"],
    ["risk management", "principal risks", "risk factors", "contingent liabilities"],
    4,
    8000,
  );
  const web = await webResearch(`${ctx.company} ${ctx.ticker} key risks concerns regulatory litigation India`);

  const evidence =
    [ar.text ? `ANNUAL REPORT (risk factors):\n${ar.text}` : ""]
      .filter(Boolean)
      .join("\n\n---\n\n") + webBlock(ctx, web.hits, web.text);

  const instruction =
    `Produce a RISK REGISTER for ${ctx.company} (${ctx.ticker}).\n` +
    `- register: 5–8 risks, each with company-specific evidence, the transmission mechanism (how it hits the ` +
    `financials), severity (Low/Medium/High), probability (Low/Medium/High), leading indicators to watch, and ` +
    `mitigants. Prefer SPECIFIC, company-level risks over generic boilerplate.\n` +
    `- downside_scenarios: the top 3, each with its trigger, the financial impact, and a probability (%) if ` +
    `you can reason one. Mark severity/probability "Not available" rather than guessing when unclear.`;

  return extractSection<RisksSection>({ ctx, instruction, evidence, schema: RISKS_SCHEMA, maxTokens: 2800 });
}
