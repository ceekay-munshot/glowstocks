import type { PeersSection } from "@/lib/types/report";
import { citedSchema, extractSection, type SectionCtx } from "./common";

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
  // Screener is the primary (and sufficient) source: the peer table gives the peer
  // set + headline columns, and each peer's OWN page (harvested into peerRatiosText)
  // gives the full ratios. No web call needed here.
  const evidence = [
    ctx.harvest.peersText ? `SCREENER PEER TABLE (peer set + headline columns):\n${ctx.harvest.peersText}` : "",
    ctx.harvest.peerRatiosText ? `${ctx.harvest.peerRatiosText}` : "",
    ctx.harvest.screenerText ? `SCREENER — ${ctx.company} (subject) ratios:\n${ctx.harvest.screenerText.slice(0, 5000)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");

  const instruction =
    `Produce the PEER comparison for ${ctx.company} (${ctx.ticker}).\n` +
    `- peers: one row for ${ctx.company} itself (is_self:true) PLUS every peer that appears under ` +
    `"Peer ratios — each peer's own Screener page" (typically 4–6). For EACH row fill from that peer's ` +
    `own ratios block (and the subject's block for the self row): price (INR), mcap (INR cr), pe (x), ` +
    `ev_ebitda (x), roe (%), roce (%), roa (%), sales_growth_5y (%, the 5-yr Compounded Sales Growth), ` +
    `profit_growth_5y (%, the 5-yr Compounded Profit Growth), de (x). Cite each datum to that peer's ` +
    `Screener page. Mark ONLY cells genuinely absent from the evidence as available:false — do NOT guess, ` +
    `and do NOT copy the subject's numbers onto a peer.\n` +
    `- note: one line on how ${ctx.company} screens vs peers (valuation / returns / growth).`;

  return extractSection<PeersSection>({
    ctx,
    instruction,
    evidence,
    schema: PEERS_SCHEMA,
  });
}
