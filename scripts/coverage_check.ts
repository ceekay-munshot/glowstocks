/**
 * Coverage guard — the automated check that ENDS the "export dropped a field"
 * review loop. It walks a committed report's populated leaf fields (every
 * available cited value + every content string) and asserts each one is actually
 * surfaced by the shared full-report export model (`buildReportModel`). Because
 * BOTH exports render that one model, a green check means neither the PDF nor the
 * Excel silently omits populated data.
 *
 *   npm run check:coverage                 # checks data/companies/TCS.json
 *   npm run check:coverage -- a.json b.json
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CompanyReport } from "@/lib/types/report";
import { buildReportModel, collectLeafSignatures, flattenModelText } from "@/lib/export/reportModel";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const targets = args.length ? args : [join(root, "data/companies/TCS.json")];

let failed = false;
for (const file of targets) {
  let report: CompanyReport;
  try {
    report = JSON.parse(readFileSync(file, "utf8")) as CompanyReport;
  } catch (e) {
    console.error(`✗ ${file}: could not read/parse — ${(e as Error).message}`);
    failed = true;
    continue;
  }
  const haystack = flattenModelText(buildReportModel(report));
  const leaves = collectLeafSignatures(report);
  const missing = leaves.filter((l) => !haystack.includes(l.value));
  if (missing.length) {
    failed = true;
    console.error(`\n✗ ${file}: ${missing.length} populated leaf field(s) MISSING from the full-report model:`);
    for (const m of missing.slice(0, 50)) console.error(`   ${m.path} = ${JSON.stringify(m.value)}`);
    if (missing.length > 50) console.error(`   … and ${missing.length - 50} more`);
  } else {
    console.log(`✓ ${file}: all ${leaves.length} populated leaf fields covered by the full-report export.`);
  }
}

if (failed) {
  console.error("\nCoverage check FAILED — the full report is dropping populated data. Add it to buildReportModel().\n");
  process.exit(1);
}
console.log("Coverage check passed.");
