// One-time company fact sheet. Each section is extracted in a separate model
// call, so shared figures (3-year P&L, market cap, shareholding) are extracted
// ONCE here, pre-normalised to INR crore, and injected as a verified preamble
// into every section call — so no section re-derives or re-scales them, and the
// figures stay consistent across tabs. Ported in spirit from cgchecklist's
// scripts/lib/facts.ts. Best-effort: returns "" on any failure.

import { completeJSON } from "./bedrock";
import type { HarvestResult } from "./harvest";
import { relevantPages } from "./text";

const SYSTEM =
  "You are a precise financial-data extraction engine for INDIAN listed companies. " +
  "Extract ONLY what the evidence states — never guess. Convert EVERY monetary figure " +
  "to INR crore (a figure in INR million ÷ 10; a figure in INR lakh ÷ 100; a figure " +
  "already in crore stays as-is). If a value is not present in the evidence, use null.";

const FIN_TERMS = [
  "revenue", "sales", "ebitda", "profit", "pat", "cash", "borrowings", "debt",
  "equity", "net worth", "finance", "depreciation",
];
const FIN_HINTS = [
  "statement of profit and loss", "total income", "profit for the year",
  "cash and cash equivalents", "total borrowings", "total equity",
];
const HOLD_TERMS = ["promoter", "shareholding", "pledge", "fii", "dii", "public"];
const HOLD_HINTS = ["shareholding pattern", "promoter and promoter group", "pledged"];

interface FinYear {
  period?: string;
  revenue?: number | null;
  ebitda?: number | null;
  pat?: number | null;
}

interface FactsShape {
  sector?: string | null;
  industry?: string | null;
  market_cap_cr?: number | null;
  price_inr?: number | null;
  financials?: FinYear[];
  promoter_holding_pct?: number | null;
  promoter_pledge_pct?: number | null;
  net_debt_cr?: number | null;
}

const FACTS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    sector: { type: ["string", "null"] },
    industry: { type: ["string", "null"] },
    market_cap_cr: { type: ["number", "null"] },
    price_inr: { type: ["number", "null"] },
    financials: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          period: { type: ["string", "null"] },
          revenue: { type: ["number", "null"] },
          ebitda: { type: ["number", "null"] },
          pat: { type: ["number", "null"] },
        },
      },
    },
    promoter_holding_pct: { type: ["number", "null"] },
    promoter_pledge_pct: { type: ["number", "null"] },
    net_debt_cr: { type: ["number", "null"] },
  },
} as const;

const num = (n: unknown): string =>
  n === null || n === undefined || Number.isNaN(Number(n)) ? "n/a" : Number(n).toFixed(0);

function formatFacts(company: string, f: FactsShape): string {
  const lines: string[] = [
    `=== ${company.toUpperCase()} — VERIFIED FACT SHEET (INR crore) ===`,
    `Use these figures VERBATIM for consistency across all sections. All money is ALREADY in INR crore — never rescale.`,
  ];
  if (f.sector) lines.push(`Sector: ${f.sector}${f.industry ? ` / ${f.industry}` : ""}.`);
  if (f.market_cap_cr != null) lines.push(`Market cap: INR ${num(f.market_cap_cr)} cr.`);
  if (f.price_inr != null) lines.push(`Price: INR ${num(f.price_inr)}.`);
  if (f.net_debt_cr != null) {
    lines.push(`Net ${f.net_debt_cr < 0 ? "cash" : "debt"}: INR ${num(Math.abs(f.net_debt_cr))} cr.`);
  }
  const fin = (f.financials ?? []).filter((y) => y && y.period);
  if (fin.length) {
    lines.push(`Financials (INR cr):`);
    for (const y of fin) {
      lines.push(`  ${y.period}: revenue ${num(y.revenue)}, EBITDA ${num(y.ebitda)}, PAT ${num(y.pat)}`);
    }
  }
  if (f.promoter_holding_pct != null) {
    lines.push(
      `Promoter holding: ${f.promoter_holding_pct}%` +
        (f.promoter_pledge_pct != null ? `; pledged ${f.promoter_pledge_pct}%` : ""),
    );
  }
  return lines.length > 2 ? lines.join("\n") : "";
}

/** Build the authoritative fact-sheet preamble from the harvested filings. */
export async function buildCompanyFacts(company: string, harvest: HarvestResult): Promise<string> {
  if (!harvest.screenerText && !harvest.annualReportText) return "";

  const fin = relevantPages(harvest.annualReportText, FIN_TERMS, FIN_HINTS, 6, 10000);
  const hold = relevantPages(harvest.annualReportText, HOLD_TERMS, HOLD_HINTS, 3, 5000);
  const evidence = [
    harvest.screenerText ? `SCREENER FINANCIALS (${harvest.name ?? company}):\n${harvest.screenerText}` : "",
    fin.text ? `ANNUAL REPORT (P&L / balance sheet):\n${fin.text}` : "",
    hold.text ? `ANNUAL REPORT (shareholding):\n${hold.text}` : "",
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");
  if (!evidence.trim()) return "";

  const prompt =
    `Company: ${company}\n\nEVIDENCE (use ONLY this):\n${evidence}\n\n` +
    `Return STRICT JSON. Every monetary value in INR crore. Give the latest 3 financial ` +
    `years, newest last. Use null when a value is absent. net_debt_cr is total borrowings ` +
    `minus cash & bank (negative = net cash).`;

  try {
    const f = await completeJSON<FactsShape>(
      { prompt, system: SYSTEM, maxTokens: 4000 },
      FACTS_SCHEMA,
    );
    return formatFacts(company, f);
  } catch {
    return "";
  }
}
