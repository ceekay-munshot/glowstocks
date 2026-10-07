import type { PeersSection } from "@/lib/types/report";
import { webResearch } from "../firecrawl";
import { citedSchema, extractSection, webBlock, type SectionCtx } from "./common";

const n = () => citedSchema("number");

const PEER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name"],
  properties: {
    name: { type: "string" },
    ticker: { type: "string" },
    is_self: { type: "boolean" },
    price: n(),
    mcap: n(),
    pe: n(),
    ev_ebitda: n(),
    roe: n(),
    roce: n(),
    roa: n(),
    sales_growth_5y: n(),
    profit_growth_5y: n(),
    de: n(),
  },
};

const PEERS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["peers"],
  properties: {
    peers: { type: "array", items: PEER_SCHEMA },
    note: { type: "string" },
  },
};

export async function extractPeers(ctx: SectionCtx): Promise<PeersSection> {
  const web = await webResearch(
    `${ctx.company} ${ctx.ticker} peer comparison P/E EV/EBITDA ROE ROCE debt equity India listed competitors`,
  );

  const evidence =
    [
      ctx.harvest.peersText ? `SCREENER PEER TABLE:\n${ctx.harvest.peersText}` : "",
      ctx.harvest.screenerText ? `SCREENER (subject company ratios):\n${ctx.harvest.screenerText.slice(0, 4000)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n---\n\n") + webBlock(ctx, web.hits, web.text);

  const instruction =
    `Produce the PEER comparison for ${ctx.company} (${ctx.ticker}).\n` +
    `- peers: 4–7 rows INCLUDING ${ctx.company} itself (set is_self:true on its row). For each peer: ` +
    `price (INR), mcap (INR cr), pe (x), ev_ebitda (x), roe (%), roce (%), roa (%), sales_growth_5y (%), ` +
    `profit_growth_5y (%), de (x). Use the Screener peer table where present; cite each datum. ` +
    `Mark any cell the evidence doesn't support as available:false — do NOT guess peer numbers.\n` +
    `- note: one line on how the company screens vs peers.`;

  return extractSection<PeersSection>({
    ctx,
    instruction,
    evidence,
    schema: PEERS_SCHEMA,
    maxTokens: 3000,
  });
}
