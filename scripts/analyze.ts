// glowstocks research engine — on-demand, source-backed equity research for one
// Indian listed company. Runs in GitHub Actions (NOT the Worker):
//
//   tsx scripts/analyze.ts <TICKER> ["Company Name"] [--sections snapshot,financials]
//
// Flow: Bedrock preflight → Screener + filings harvest → one verified fact sheet →
// extract each section (strict, cited JSON) via a small concurrency pool → sanity
// checks → read-back reconciliation → write data/companies/<TICKER>.json (durable
// cache, committed by the workflow) + report-output/<TICKER>.json (artifact for
// immediate read-back). Credits are never wasted: read-once harvest, run-level
// Firecrawl cache, Bedrock prompt caching, and incremental (--sections) refresh.

import { mkdirSync, writeFileSync } from "node:fs";
import type {
  BusinessSection,
  CapacitySection,
  CompanyReport,
  ConcallSection,
  CustomersSection,
  EstimatesSection,
  FinancialsSection,
  GrowthSection,
  IntegritySection,
  MnaSection,
  PeersSection,
  RisksSection,
  SectionKey,
  SnapshotSection,
  SourceRef,
  ThesisSection,
} from "@/lib/types/report";
import { preflight, activeModelId, activeRegion } from "./lib/bedrock";
import { harvestCompany, type HarvestResult } from "./lib/harvest";
import { buildCompanyFacts } from "./lib/facts";
import { SourceCollector } from "./lib/sources";
import { scrapedUrls } from "./lib/firecrawl";
import { extractSnapshot } from "./lib/sections/snapshot";
import { extractFinancials } from "./lib/sections/financials";
import { extractBusiness } from "./lib/sections/business";
import { extractPeers } from "./lib/sections/peers";
import { extractThesis } from "./lib/sections/thesis";
import { extractCustomers } from "./lib/sections/customers";
import { extractCapacity } from "./lib/sections/capacity";
import { extractGrowth } from "./lib/sections/growth";
import { extractConcall } from "./lib/sections/concall";
import { extractMna } from "./lib/sections/mna";
import { extractEstimates } from "./lib/sections/estimates";
import { extractRisks } from "./lib/sections/risks";
import { extractIntegrity } from "./lib/sections/integrity";
import { sanityCheck } from "./lib/sanity";
import { reviewReport } from "./lib/review";
import {
  ensureCompaniesDir,
  loadExisting,
  refreshPlan,
  reportPath,
  seenUrls,
} from "./lib/cache";
import type { SectionCtx } from "./lib/sections/common";

const CONCURRENCY = Number(process.env.ANALYZE_CONCURRENCY) || 3;
const ARTIFACT_DIR = "report-output";
const SCHEMA_VERSION = 1;

async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return out;
}

const emptySnapshot = (): SnapshotSection => ({
  business_model: "Not available",
  stance: "Not available",
  kpis: [],
});
const emptyBusiness = (): BusinessSection => ({ segments: [], geographies: [] });
const emptyFinancials = (): FinancialsSection => ({ history: [] });
const emptyPeers = (): PeersSection => ({ peers: [] });
const emptyThesis = (): ThesisSection => ({
  stance: "Not available",
  supports: [],
  counters: [],
  change_my_mind: [],
  scenarios: [],
});
const emptyCustomers = (): CustomersSection => ({ applicable: false, not_applicable_reason: "Not available", groups: [], order_book: [] });
const emptyCapacity = (): CapacitySection => ({ applicable: false, kind: "Not available", sites: [], metrics: [] });
const emptyGrowth = (): GrowthSection => ({ drivers: [], catalysts: [], downside_triggers: [] });
const emptyConcall = (): ConcallSection => ({ available: false, highlights: [], insights: [] });
const emptyMna = (): MnaSection => ({ found: false, deals: [] });
const emptyEstimates = (): EstimatesSection => ({ available: false, forward: [] });
const emptyRisks = (): RisksSection => ({ register: [], downside_scenarios: [] });
const emptyIntegrity = (): IntegritySection => ({ checks: [] });

function parseArgs(argv: string[]): { ticker: string; company: string; sections: SectionKey[] | null } {
  const positional: string[] = [];
  let sections: SectionKey[] | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--sections") {
      const list = (argv[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
      sections = list as SectionKey[];
    } else {
      positional.push(argv[i]);
    }
  }
  return {
    ticker: (positional[0] || "").trim().toUpperCase(),
    company: (positional[1] || "").trim(),
    sections,
  };
}

async function main() {
  const { ticker, company: companyArg, sections } = parseArgs(process.argv.slice(2));
  if (!ticker) {
    console.error('Usage: tsx scripts/analyze.ts <TICKER> ["Company Name"] [--sections a,b]');
    process.exit(1);
  }

  console.log(`\n=== glowstocks analysis: ${ticker} ===`);
  console.log(`LLM: ${activeModelId()} @ ${activeRegion()}`);

  // 1) Preflight — abort early (before any paid harvest) if Bedrock is unreachable.
  const pf = await preflight();
  console.log(`Preflight: ${pf.ok ? "OK" : "FAILED"} — ${pf.detail}`);
  if (!pf.ok) {
    console.error("Aborting: Bedrock/Claude unreachable. Fix CLAUDE_BEDROCK_* and retry.");
    process.exit(1);
  }

  // 2) Incremental plan + read-once cache.
  const existing = loadExisting(ticker);
  const { refresh, carry } = refreshPlan(existing, sections);
  const skip = seenUrls(existing);
  console.log(
    `Plan: ${existing ? "refresh" : "fresh"} | sections=[${[...refresh].join(", ")}] | ` +
      `${skip.size} URL(s) in read-once cache`,
  );

  // 3) Harvest Screener + filings (skipping already-seen document URLs).
  console.log("Harvesting Screener + annual report + concalls + presentation…");
  const harvest: HarvestResult = await harvestCompany(ticker, { skipUrls: skip });
  const company = companyArg || harvest.name || existing?.company || ticker;
  console.log(
    `  company: ${company} | loggedIn: ${harvest.loggedIn} | screener: ${harvest.screenerText.length}c | ` +
      `AR: ${harvest.annualReportText.length}c | docs: ${harvest.documents.length}`,
  );
  if (harvest.note) console.log(`  note: ${harvest.note}`);

  // 4) One verified fact sheet, injected (cached) into every section call.
  console.log("Building verified fact sheet…");
  const facts = await buildCompanyFacts(company, harvest).catch(() => "");
  console.log(facts ? `  fact sheet: ${facts.split("\n").length} lines` : "  fact sheet: (none)");

  // 5) Seed the source spine with the harvested filings + Screener.
  const collector = new SourceCollector();
  collector.add({ title: `Screener — ${company}`, type: "screener", date: null, url: harvest.url });
  for (const d of harvest.documents) collector.addDoc(d);
  // Carry forward sources from sections we are NOT refreshing.
  if (carry) {
    for (const s of carry.sources ?? []) collector.add(s);
  }

  const ctx: SectionCtx = { company, ticker, harvest, facts, collector };

  // 6) Extract the requested sections concurrently; carry the rest forward.
  type Task = { key: SectionKey; run: () => Promise<unknown>; empty: () => unknown };
  const tasks: Task[] = [
    { key: "snapshot", run: () => extractSnapshot(ctx), empty: emptySnapshot },
    { key: "financials", run: () => extractFinancials(ctx), empty: emptyFinancials },
    { key: "business", run: () => extractBusiness(ctx), empty: emptyBusiness },
    { key: "peers", run: () => extractPeers(ctx), empty: emptyPeers },
    { key: "thesis", run: () => extractThesis(ctx), empty: emptyThesis },
    { key: "customers", run: () => extractCustomers(ctx), empty: emptyCustomers },
    { key: "capacity", run: () => extractCapacity(ctx), empty: emptyCapacity },
    { key: "growth", run: () => extractGrowth(ctx), empty: emptyGrowth },
    { key: "concall", run: () => extractConcall(ctx), empty: emptyConcall },
    { key: "mna", run: () => extractMna(ctx), empty: emptyMna },
    { key: "estimates", run: () => extractEstimates(ctx), empty: emptyEstimates },
    { key: "risks", run: () => extractRisks(ctx), empty: emptyRisks },
    { key: "integrity", run: () => extractIntegrity(ctx), empty: emptyIntegrity },
  ];

  const results: Record<string, unknown> = {};
  await pool(
    tasks.filter((t) => refresh.has(t.key)),
    CONCURRENCY,
    async (t) => {
      try {
        results[t.key] = await t.run();
        console.log(`  [${t.key}] extracted`);
      } catch (e) {
        results[t.key] = t.empty();
        console.warn(`  [${t.key}] FAILED: ${(e as Error).message}`);
      }
    },
  );

  // Carry forward non-refreshed sections from the existing report (and keep their
  // sources in the spine so citations still resolve).
  for (const t of tasks) {
    if (refresh.has(t.key)) continue;
    const prev = carry ? (carry as unknown as Record<string, unknown>)[t.key] : undefined;
    results[t.key] = prev ?? t.empty();
    if (prev) collector.attach(prev);
  }

  const snapshot = (results.snapshot as SnapshotSection) ?? emptySnapshot();
  const business = (results.business as BusinessSection) ?? emptyBusiness();
  const financials = (results.financials as FinancialsSection) ?? emptyFinancials();
  const peers = (results.peers as PeersSection) ?? emptyPeers();
  const thesis = (results.thesis as ThesisSection) ?? emptyThesis();
  const customers = (results.customers as CustomersSection) ?? emptyCustomers();
  const capacity = (results.capacity as CapacitySection) ?? emptyCapacity();
  const growth = (results.growth as GrowthSection) ?? emptyGrowth();
  const concall = (results.concall as ConcallSection) ?? emptyConcall();
  const mna = (results.mna as MnaSection) ?? emptyMna();
  const estimates = (results.estimates as EstimatesSection) ?? emptyEstimates();
  const risks = (results.risks as RisksSection) ?? emptyRisks();
  const integrity = (results.integrity as IntegritySection) ?? emptyIntegrity();

  const now = new Date().toISOString();
  const asOf =
    financials.latest_fy?.period || financials.history.at(-1)?.period || now.slice(0, 10);

  const sources: SourceRef[] = collector.list();
  const mergedSeen = new Set<string>([
    ...skip,
    ...harvest.documents.map((d) => d.url).filter((u): u is string => !!u),
    ...scrapedUrls(),
    ...collector.seenUrls(),
  ]);

  const report: CompanyReport = {
    schemaVersion: SCHEMA_VERSION,
    ticker,
    company,
    exchange: existing?.exchange || "NSE/BSE",
    country: "India",
    currency: "INR",
    as_of: asOf,
    last_updated: now,
    units_note: "Figures in INR crore unless the datum states otherwise; margins & returns in %, multiples in x.",
    generated_by: "glowstocks engine",
    coverage: {
      snapshot: snapshot.kpis.length > 0 || snapshot.business_model !== "Not available",
      business: business.segments.length > 0 || business.geographies.length > 0,
      financials: !!financials.latest_fy || financials.history.length > 0,
      peers: peers.peers.length > 0,
      thesis: thesis.supports.length > 0 || thesis.scenarios.length > 0,
      customers: customers.groups.length > 0 || customers.order_book.length > 0 || (!customers.applicable && !!customers.not_applicable_reason),
      capacity: capacity.sites.length > 0 || capacity.metrics.length > 0 || (!capacity.applicable && !!capacity.not_applicable_reason),
      growth: growth.drivers.length > 0 || growth.catalysts.length > 0,
      concall: concall.available && concall.highlights.length > 0,
      mna: mna.deals.length > 0 || mna.found === false,
      estimates: estimates.available && estimates.forward.length > 0,
      risks: risks.register.length > 0,
      integrity: integrity.checks.length > 0,
      notes: harvest.note,
    },
    snapshot,
    business,
    financials,
    peers,
    thesis,
    customers,
    capacity,
    growth,
    concall,
    mna,
    estimates,
    risks,
    integrity,
    sources,
    sources_seen: [...mergedSeen],
  };

  // 7) Sanity checks + read-back reconciliation.
  const sanity = sanityCheck(report);
  const corrections = reviewReport(report);
  for (const w of sanity) console.log(`  [sanity] ${w}`);
  for (const c of corrections) console.log(`  [review] ${c}`);
  if (sanity.length || corrections.length) {
    report.coverage.notes = [report.coverage.notes, ...sanity, ...corrections]
      .filter(Boolean)
      .join(" | ")
      .slice(0, 2000);
  }

  // 8) Write the durable cache + the artifact copy.
  ensureCompaniesDir();
  writeFileSync(reportPath(ticker), JSON.stringify(report, null, 2));
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(`${ARTIFACT_DIR}/${ticker}.json`, JSON.stringify(report, null, 2));

  const filled = Object.entries(report.coverage)
    .filter(([k, v]) => k !== "notes" && v)
    .map(([k]) => k);
  console.log(`\nCoverage: [${filled.join(", ")}] | sources: ${sources.length} | seen URLs: ${mergedSeen.size}`);
  console.log(`Wrote ${reportPath(ticker)} and ${ARTIFACT_DIR}/${ticker}.json`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
