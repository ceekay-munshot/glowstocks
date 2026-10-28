import type { BusinessSection } from "@/lib/types/report";
import { relevantPages } from "../text";
import { webResearch } from "../firecrawl";
import { citedSchema, extractSection, webBlock, type SectionCtx } from "./common";

const SEGMENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "pct_revenue", "trend"],
  properties: {
    name: { type: "string" },
    pct_revenue: citedSchema("number"),
    revenue: citedSchema("number"),
    trend: { enum: ["growing", "shrinking", "stable", "Not available"] },
    note: { type: "string" },
  },
};

const GEO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["region", "pct_revenue"],
  properties: {
    region: { type: "string" },
    pct_revenue: citedSchema("number"),
    driver: { type: "string" },
    risk: { type: "string" },
  },
};

const BUSINESS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["segments", "geographies"],
  properties: {
    summary: { type: "string" },
    segments: { type: "array", items: SEGMENT_SCHEMA },
    geographies: { type: "array", items: GEO_SCHEMA },
  },
};

/** Sum of the available pct_revenue cells (0 when a mix came back all-blank). */
function pctSum(rows: { pct_revenue?: { available?: boolean; value?: number | null } }[]): number {
  return rows.reduce((a, r) => {
    const v = r.pct_revenue;
    return a + (v && v.available && typeof v.value === "number" ? v.value : 0);
  }, 0);
}

export async function extractBusiness(ctx: SectionCtx): Promise<BusinessSection> {
  const segPages = relevantPages(
    ctx.harvest.annualReportText,
    ["segment", "geograph", "revenue", "region", "vertical", "business", "industry"],
    ["segment reporting", "segment revenue", "geographical", "revenue by", "business segments", "revenue by vertical", "revenue by geography"],
    5,
    9000,
  );
  // The segment-by-vertical % and revenue-by-geography % almost always live in the
  // latest quarterly fact sheet / investor presentation — feed it directly.
  const presentation = ctx.harvest.documents.find((d) => d.kind === "presentation");
  const pptPages = presentation
    ? relevantPages(
        presentation.text,
        ["segment", "vertical", "geograph", "region", "revenue", "industry", "service", "business mix"],
        ["revenue by", "by vertical", "by geography", "segment", "geograph", "business mix"],
        4,
        6000,
      )
    : { text: "" };

  const buildEvidence = (webText: string): string =>
    [
      pptPages.text ? `INVESTOR PRESENTATION / FACT SHEET (segment & geography mix):\n${pptPages.text}` : "",
      segPages.text ? `ANNUAL REPORT (segments / geography):\n${segPages.text}` : "",
      ctx.harvest.screenerText ? `SCREENER:\n${ctx.harvest.screenerText.slice(0, 6000)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n---\n\n") + webText;

  const instruction =
    `Produce the BUSINESS breakdown for ${ctx.company} (${ctx.ticker}).\n` +
    `- summary: one line on the revenue mix.\n` +
    `- segments: each reported business segment / vertical with pct_revenue (% of total revenue, cited), ` +
    `optional absolute revenue (INR cr), and trend (growing / shrinking / stable) from the ` +
    `evidence. The percentages should sum to ~100 — the split is in the investor presentation / fact ` +
    `sheet or the annual report's segment note; look there before giving up.\n` +
    `- geographies: operating geographies with pct_revenue (cited), a growth driver and a key risk. ` +
    `The geography mix should also sum to ~100.\n` +
    `Mark anything genuinely unsupported as available:false (never guess a split).`;

  // First pass: AR + presentation + screener + a general web search.
  const web = await webResearch(
    `${ctx.company} revenue breakdown by segment and geography percentage ${ctx.ticker} India`,
  );
  let result = await extractSection<BusinessSection>({
    ctx,
    instruction,
    evidence: buildEvidence(webBlock(ctx, web.hits, web.text)),
    schema: BUSINESS_SCHEMA,
  });

  // Validation: if segments/geographies came through as NAMES but the mix is ~0
  // (percentages missing), the split wasn't in the evidence. Search a fact sheet
  // specifically and retry ONCE, keeping whichever result has the better coverage.
  const segSum = pctSum(result.segments);
  const geoSum = pctSum(result.geographies);
  const segBad = result.segments.length > 0 && segSum < 50;
  const geoBad = result.geographies.length > 0 && geoSum < 50;
  if (segBad || geoBad) {
    const web2 = await webResearch(
      `${ctx.company} ${ctx.ticker} revenue by segment and by geography latest quarter fact sheet investor presentation percentage mix`,
    );
    if (web2.text) {
      const retry = await extractSection<BusinessSection>({
        ctx,
        instruction,
        evidence: buildEvidence(webBlock(ctx, web2.hits, web2.text)),
        schema: BUSINESS_SCHEMA,
      });
      if (pctSum(retry.segments) + pctSum(retry.geographies) > segSum + geoSum) result = retry;
    }
  }

  return result;
}
