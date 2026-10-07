import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Read a string binding/var from the Cloudflare env first, then process.env
 * (plain `next dev`). The ONLY secret the Worker ever reads is
 * GITHUB_DISPATCH_TOKEN; the research secrets live only in GitHub Actions.
 */
export function readEnv(name: string): string | undefined {
  try {
    const bindings = getCloudflareContext().env as Record<string, unknown>;
    const v = bindings[name];
    if (typeof v === "string" && v.trim()) return v.trim();
  } catch {
    // no Cloudflare context (plain `next dev`)
  }
  const p = process.env[name];
  return p && p.trim() ? p.trim() : undefined;
}

export function repoSlug(): string {
  return readEnv("GITHUB_REPO") ?? "ceekay-munshot/glowstocks";
}

/** Branch the workflow commits reports to / dispatches against. */
export function reportsRef(): string {
  return readEnv("GITHUB_REPORTS_REF") ?? "main";
}
