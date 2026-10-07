import type { CustomersSection } from "@/lib/types/report";
import { relevantPages } from "../text";
import { webResearch } from "../firecrawl";
import { citedSchema, extractSection, webBlock, type SectionCtx } from "./common";

const GROUP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["segment", "concentration"],
  properties: {
    segment: { type: "string" },
    names: { type: "string" },
    concentration: citedSchema("number"),
    risk: { type: "string" },
  },
};

const ORDER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["metric", "value"],
  properties: {
    metric: { type: "string" },
    value: citedSchema("number"),
    mix: { type: "string" },
    coverage: citedSchema("number"),
    qoq_change: citedSchema("number"),
  },
};

const CUSTOMERS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["applicable", "groups", "order_book"],
  properties: {
    applicable: { type: "boolean" },
    not_applicable_reason: { type: "string" },
    summary: { type: "string" },
    groups: { type: "array", items: GROUP_SCHEMA },
    order_book: { type: "array", items: ORDER_SCHEMA },
  },
};

export async function extractCustomers(ctx: SectionCtx): Promise<CustomersSection> {
  const ar = relevantPages(
    ctx.harvest.annualReportText,
    ["customer", "client", "concentration", "order", "deal", "contract", "pipeline"],
    ["customer concentration", "top customers", "order book", "total contract value", "major clients"],
    4,
    8000,
  );
  const concall = ctx.harvest.documents.find((d) => d.kind === "concall");
  const concallText = concall
    ? relevantPages(concall.text, ["deal", "tcv", "order", "client", "win", "pipeline", "book"], ["total contract value", "deal wins", "order book", "book to bill"], 2, 4000).text
    : "";
  const web = await webResearch(`${ctx.company} ${ctx.ticker} order book TCV large deal wins client concentration India`);

  const evidence =
    [
      ar.text ? `ANNUAL REPORT (customers / orders):\n${ar.text}` : "",
      concallText ? `CONCALL (${concall?.name}):\n${concallText}` : "",
    ]
      .filter(Boolean)
      .join("\n\n---\n\n") + webBlock(ctx, web.hits, web.text);

  const instruction =
    `Produce CUSTOMERS & ORDER BOOK for ${ctx.company} (${ctx.ticker}).\n` +
    `- groups: client/customer mix — each a segment (e.g. "Top 5 clients", "BFSI", "Single largest client") ` +
    `with concentration as % of revenue (cited), disclosed key names if any, and a dependency risk.\n` +
    `- order_book: the order book / deal pipeline. For IT-services companies use TCV / large-deal wins / ` +
    `book-to-bill. Each item: metric name, value (INR cr, or x for book-to-bill), optional mix, coverage, ` +
    `and QoQ change (%). Cite every figure.\n` +
    `- If the company has NO order-book or pipeline concept and discloses no client concentration, set ` +
    `applicable=false and give a one-line not_applicable_reason; otherwise applicable=true. Never guess a %.`;

  return extractSection<CustomersSection>({ ctx, instruction, evidence, schema: CUSTOMERS_SCHEMA, maxTokens: 2400 });
}
