// Deterministic citation verification — ZERO model / Firecrawl cost. After a
// report is assembled, walk it and, for every cited NUMBER big enough to be
// distinctive (|value| >= 1000, so a coincidental digit match is unlikely),
// check whether that number actually appears in the harvested FILING text of the
// kind of source it cites. This catches a number attributed to a filing that is
// not in any harvested filing — a possible extraction slip — without any API call.
//
// It is advisory and NON-destructive: it never removes data (a number can be
// legitimately DERIVED, e.g. a margin, or REFORMATTED, so "not found verbatim"
// is a spot-check flag, not proof of error). Numbers cited to web sources can't
// be corroborated against filings here and are counted separately, not flagged.

import type { CompanyReport } from "@/lib/types/report";
import { SECTION_KEYS } from "@/lib/types/report";
import type { HarvestResult } from "./harvest";

/** Reduce any string to its bare digit sequence (drops ₹, commas, %, spaces). */
const digits = (s: string): string => s.replace(/[^0-9]/g, "");

export interface VerifyResult {
  checked: number;
  corroborated: number;
  web: number;
  /** Numbers cited to a filing but not found verbatim in any harvested filing. */
  uncorroborated: { path: string; value: number; source?: string }[];
  warnings: string[];
}

/** Does this citation point at a harvested FILING (vs an external web page)? */
function isFilingSource(url?: string | null, source?: string): boolean {
  const s = `${url ?? ""} ${source ?? ""}`.toLowerCase();
  if (/screener|annual report|concall|transcript|presentation|\bppt\b|exchange|bse|nse|filing/.test(s)) return true;
  // An explicit external URL that isn't filing-like → treat as web.
  if (url && /^https?:\/\//.test(url)) return false;
  return true; // no URL and a filing-ish name → assume filing
}

export function verifyCitations(report: CompanyReport, harvest: HarvestResult): VerifyResult {
  // One digit-only haystack of everything harvested from filings.
  const hay = digits(
    [
      harvest.screenerText,
      harvest.peerRatiosText,
      harvest.annualReportText,
      ...harvest.documents.map((d) => d.text),
    ].join("\n"),
  );

  const res: VerifyResult = { checked: 0, corroborated: 0, web: 0, uncorroborated: [], warnings: [] };

  const walk = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((n, i) => walk(n, `${path}[${i}]`));
      return;
    }
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;

    // A cited leaf: { value, available, source, url, ... }.
    if (typeof o.available === "boolean" && "value" in o) {
      const v = o.value;
      if (o.available && typeof v === "number" && Math.abs(v) >= 1000) {
        res.checked++;
        const needle = digits(String(Math.round(Math.abs(v))));
        if (needle.length >= 3 && hay.includes(needle)) {
          res.corroborated++;
        } else if (!isFilingSource(o.url as string | undefined, o.source as string | undefined)) {
          res.web++;
        } else {
          res.uncorroborated.push({ path, value: v, source: o.source as string | undefined });
        }
      }
      return; // a cited leaf has no nested citations
    }

    // Use a human label for the path where the node carries one.
    const label =
      (typeof o.label === "string" && o.label) ||
      (typeof o.name === "string" && o.name) ||
      (typeof o.region === "string" && o.region) ||
      (typeof o.period === "string" && o.period) ||
      path;
    for (const [k, val] of Object.entries(o)) walk(val, label === path ? `${path}.${k}` : `${label}.${k}`);
  };

  for (const key of SECTION_KEYS) {
    walk((report as unknown as Record<string, unknown>)[key], key);
  }

  if (res.checked > 0) {
    res.warnings.push(
      `citation check: ${res.corroborated}/${res.checked} large cited numbers found verbatim in harvested filings` +
        (res.web ? `, ${res.web} cited to web sources (not checkable here)` : "") +
        (res.uncorroborated.length
          ? `, ${res.uncorroborated.length} not found verbatim (may be derived/reformatted — spot-check): ` +
            res.uncorroborated.slice(0, 8).map((u) => `${u.path}=${u.value}`).join(", ")
          : ""),
    );
  }
  return res;
}
