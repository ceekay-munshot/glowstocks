// Claude via the AWS Bedrock Runtime Converse API. Raw HTTPS + a Bedrock API key
// as a bearer token (NOT SigV4, no AWS SDK). Ported from cgchecklist2.0's
// lib/llm/bedrock-claude.ts.
//
// SECURITY: the key (CLAUDE_BEDROCK_API_KEY) lives ONLY in GitHub Actions. This
// module runs in the Action, never in the Worker or the browser.

import {
  completeJSONWith,
  LlmError,
  type CompleteOpts,
  type CompleteResult,
} from "./json";

const PING_TIMEOUT_MS = 12_000;
const COMPLETE_TIMEOUT_MS = 90_000;

const API_KEY_ENV = "CLAUDE_BEDROCK_API_KEY";
const DEFAULT_REGION = "us-east-1";
const DEFAULT_MODEL_ID = "us.anthropic.claude-sonnet-4-5-20250929-v1:0";

const apiKey = () => process.env[API_KEY_ENV]?.trim() ?? "";
export const activeRegion = () =>
  process.env.CLAUDE_BEDROCK_REGION?.trim() || DEFAULT_REGION;
export const activeModelId = (override?: string) =>
  override || process.env.CLAUDE_BEDROCK_MODEL_ID?.trim() || DEFAULT_MODEL_ID;

function endpoint(model: string): string {
  return `https://bedrock-runtime.${activeRegion()}.amazonaws.com/model/${encodeURIComponent(
    model,
  )}/converse`;
}

interface ConverseResponse {
  output?: { message?: { content?: Array<{ text?: string }> } };
  usage?: { inputTokens?: number; outputTokens?: number };
}

type SystemBlock = { text: string } | { cachePoint: { type: "default" } };

export async function complete(opts: CompleteOpts): Promise<CompleteResult> {
  const key = apiKey();
  if (!key) throw new LlmError(`${API_KEY_ENV} is not set`);

  const body: Record<string, unknown> = {
    messages: [{ role: "user", content: [{ text: opts.prompt }] }],
    inferenceConfig: {
      temperature: opts.temperature ?? 0.2,
      maxTokens: opts.maxTokens ?? 2000,
    },
  };

  if (opts.system) {
    // Prompt caching: a cachePoint after the shared system/context block lets
    // Bedrock reuse that prefix across the many per-section calls in one run.
    const system: SystemBlock[] = [{ text: opts.system }];
    if (opts.cacheSystem) system.push({ cachePoint: { type: "default" } });
    body.system = system;
  }

  let res: Response;
  try {
    res = await fetch(endpoint(activeModelId(opts.model)), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(COMPLETE_TIMEOUT_MS),
    });
  } catch (e) {
    throw new LlmError(`request failed: ${(e as Error).message}`, e);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new LlmError(`HTTP ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as ConverseResponse;
  const text = (data.output?.message?.content ?? [])
    .map((c) => c.text ?? "")
    .join("");
  return { text };
}

/** Structured output validated against a strict JSON Schema (with retries). */
export function completeJSON<T>(opts: CompleteOpts, schema: object): Promise<T> {
  return completeJSONWith<T>(complete, opts, schema);
}

export function isConfigured(): boolean {
  return apiKey().length > 0;
}

/**
 * Cheap 1-token health check. The run aborts early if Bedrock is unreachable,
 * so a misconfigured key never burns Screener/Firecrawl credits.
 */
export async function preflight(): Promise<{ ok: boolean; detail: string }> {
  const key = apiKey();
  if (!key) return { ok: false, detail: `${API_KEY_ENV} not set` };
  try {
    const res = await fetch(endpoint(activeModelId()), {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: [{ text: "ping" }] }],
        inferenceConfig: { maxTokens: 1, temperature: 0 },
      }),
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });
    if (res.ok) return { ok: true, detail: `HTTP ${res.status}` };
    const detail = await res.text().catch(() => "");
    return { ok: false, detail: `HTTP ${res.status}: ${detail.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, detail: `unreachable: ${(e as Error).message}` };
  }
}

export type { CompleteOpts, CompleteResult } from "./json";
export { LlmError } from "./json";
