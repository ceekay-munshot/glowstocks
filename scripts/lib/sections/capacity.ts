import type { CapacitySection } from "@/lib/types/report";
import { relevantPages } from "../text";
import { citedSchema, extractSection, type SectionCtx } from "./common";

const METRIC_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["label", "value", "available"],
  properties: {
    label: { type: "string" },
    value: { type: ["number", "string", "null"] },
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

const SITE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["site"],
  properties: {
    site: { type: "string" },
    product: { type: "string" },
    capacity: citedSchema("number"),
    utilization: citedSchema("number"),
    expansion: { type: "string" },
    capex: citedSchema("number"),
    timeline: { type: "string" },
  },
};

const CAPACITY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["applicable", "kind", "sites", "metrics"],
  properties: {
    applicable: { type: "boolean" },
    not_applicable_reason: { type: "string" },
    kind: { enum: ["manufacturing", "delivery", "other", "Not available"] },
    summary: { type: "string" },
    sites: { type: "array", items: SITE_SCHEMA },
    metrics: { type: "array", items: METRIC_SCHEMA },
  },
};

export async function extractCapacity(ctx: SectionCtx): Promise<CapacitySection> {
  const ar = relevantPages(
    ctx.harvest.annualReportText,
    ["capacity", "plant", "facility", "manufacturing", "utilisation", "utilization", "employees", "headcount", "delivery", "centre", "center", "office", "capex", "expansion"],
    ["installed capacity", "capacity utilisation", "number of employees", "delivery centres", "manufacturing facilities", "properties"],
    5,
    9000,
  );
  const presentation = ctx.harvest.documents.find((d) => d.kind === "presentation");
  const pptText = presentation ? relevantPages(presentation.text, ["capacity", "headcount", "centre", "employees", "footprint"], ["delivery centres", "headcount", "capacity"], 2, 3000).text : "";

  const evidence = [
    ar.text ? `ANNUAL REPORT (footprint / capacity):\n${ar.text}` : "",
    pptText ? `INVESTOR PRESENTATION:\n${pptText}` : "",
    ctx.harvest.screenerText ? `SCREENER:\n${ctx.harvest.screenerText.slice(0, 3000)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");

  const instruction =
    `Produce CAPACITY & FOOTPRINT for ${ctx.company} (${ctx.ticker}).\n` +
    `- For a MANUFACTURING company: sites = each plant/site with product, installed capacity (cited, with unit), ` +
    `utilization %, expansion plan, capex (INR cr) and timeline. Set kind="manufacturing".\n` +
    `- For an IT-services / non-manufacturing company: set kind="delivery"; put headline footprint numbers ` +
    `(total headcount, delivery centres, offices, countries) in metrics, and key delivery locations in sites ` +
    `(capacity/utilization may be Not available). \n` +
    `- metrics: 2–5 headline footprint KPIs, each cited.\n` +
    `- Only if the company truly has no operating footprint set applicable=false + a reason. Never guess a number.`;

  return extractSection<CapacitySection>({ ctx, instruction, evidence, schema: CAPACITY_SCHEMA });
}
