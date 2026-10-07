// Read a company's report back from GitHub using the SAME fine-grained PAT the
// "Run" button needs (GITHUB_DISPATCH_TOKEN — Actions: read & write, Contents:
// read). Two sources, newest-first:
//   1) the latest `glow-report-<TICKER>` Actions artifact (fresh seconds after a
//      run completes, branch-independent, but expires after the repo's retention);
//   2) the committed data/companies/<TICKER>.json (durable cache across runs).
// No second secret, no Cloudflare API token, no workflow push-back.

import { unzipSync } from "fflate";
import type { CompanyReport } from "@/lib/types/report";

const GH_API = "https://api.github.com";

function ghHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "glowstocks-dashboard",
  };
}

interface ArtifactMeta {
  id: number;
  name: string;
  expired: boolean;
  created_at: string;
}

export async function listLatestArtifact(
  ticker: string,
  token: string,
  repo: string,
): Promise<{ id: number; createdAt: string } | null> {
  const wanted = `glow-report-${ticker.trim().toUpperCase()}`.toLowerCase();
  try {
    const res = await fetch(`${GH_API}/repos/${repo}/actions/artifacts?per_page=100`, {
      headers: ghHeaders(token),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { artifacts?: ArtifactMeta[] };
    const match = (data.artifacts ?? [])
      .filter((a) => !a.expired && a.name.trim().toLowerCase() === wanted)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
    return match ? { id: match.id, createdAt: match.created_at } : null;
  } catch {
    return null;
  }
}

async function downloadZip(url: string, token: string): Promise<Uint8Array | null> {
  try {
    let res = await fetch(url, { headers: ghHeaders(token), redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      res = await fetch(loc);
    } else if (res.status === 0 || res.type === "opaqueredirect") {
      res = await fetch(url, { headers: ghHeaders(token), redirect: "follow" });
    }
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function parseReport(text: string): CompanyReport | null {
  try {
    const r = JSON.parse(text) as CompanyReport;
    return r && r.ticker && r.snapshot ? r : null;
  } catch {
    return null;
  }
}

export async function downloadArtifactReport(
  artifactId: number,
  token: string,
  repo: string,
): Promise<CompanyReport | null> {
  const zip = await downloadZip(`${GH_API}/repos/${repo}/actions/artifacts/${artifactId}/zip`, token);
  if (!zip) return null;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(zip);
  } catch {
    return null;
  }
  const key = Object.keys(files).find((k) => /\.json$/i.test(k));
  if (!key) return null;
  return parseReport(new TextDecoder().decode(files[key]));
}

/** Read the committed data/companies/<TICKER>.json via the Contents API. */
export async function fetchCommittedReport(
  ticker: string,
  token: string,
  repo: string,
  ref: string,
): Promise<CompanyReport | null> {
  const path = `data/companies/${ticker.trim().toUpperCase()}.json`;
  try {
    const res = await fetch(
      `${GH_API}/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`,
      { headers: { ...ghHeaders(token), Accept: "application/vnd.github.raw" } },
    );
    if (!res.ok) return null;
    return parseReport(await res.text());
  } catch {
    return null;
  }
}
