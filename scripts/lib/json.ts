// Shared structured-output driver: calls the model, parses + validates the JSON
// against a strict JSON Schema, and retries (feeding the validation error back)
// until it validates or the attempts run out. Ported from cgchecklist2.0's
// lib/llm/json.ts — the proven plumbing.

import Ajv, { type Schema, type ValidateFunction } from "ajv";

const ajv = new Ajv({ allErrors: true, strict: false });
const validatorCache = new WeakMap<object, ValidateFunction>();

function getValidator(schema: object): ValidateFunction {
  let validate = validatorCache.get(schema);
  if (!validate) {
    validate = ajv.compile(schema as unknown as Schema);
    validatorCache.set(schema, validate);
  }
  return validate;
}

/** Pull a JSON value out of a response that may be wrapped in prose or ```fences```. */
export function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : trimmed).trim();
  const firstBrace = body.search(/[{[]/);
  if (firstBrace === -1) return body;
  const lastBrace = Math.max(body.lastIndexOf("}"), body.lastIndexOf("]"));
  return lastBrace > firstBrace ? body.slice(firstBrace, lastBrace + 1) : body;
}

export const JSON_MAX_RETRIES = 2;

export interface CompleteOpts {
  prompt: string;
  system?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  /** Insert a Bedrock cachePoint after the system block (prompt caching). */
  cacheSystem?: boolean;
}

export interface CompleteResult {
  text: string;
  /** Why generation stopped (Bedrock Converse `stopReason`). "max_tokens" ⇒ truncated. */
  stopReason?: string;
}

/**
 * Hard ceiling for the self-healing escalation below. A single section's JSON
 * never approaches this; it only bounds a runaway. (`maxTokens` is a CEILING,
 * not a target — you pay per token actually generated, so a generous ceiling is
 * free and simply stops the model from being cut off mid-JSON.)
 */
export const MAX_TOKENS_CAP = 16_000;

export class LlmError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "LlmError";
  }
}

/**
 * Call `complete`, parse + validate against `schema`, retry on failure feeding the
 * validation error back so the model can self-correct. Throws after the last try.
 */
export async function completeJSONWith<T>(
  complete: (opts: CompleteOpts) => Promise<CompleteResult>,
  opts: CompleteOpts,
  schema: object,
): Promise<T> {
  const validate = getValidator(schema);
  const schemaText = JSON.stringify(schema);
  let lastError: string | undefined;
  let lastText: string | undefined;
  // The token ceiling for the NEXT attempt. Starts at the caller's budget and
  // climbs only if a response is cut off at the limit (see `truncated`), so a
  // section that outgrows its budget self-heals instead of failing — the guard
  // that keeps "section truncated into invalid JSON" from recurring.
  let budget = opts.maxTokens;
  let truncated = false;

  for (let attempt = 0; attempt <= JSON_MAX_RETRIES; attempt++) {
    if (truncated) {
      budget = Math.min(MAX_TOKENS_CAP, Math.max((budget ?? 8192) * 2, 8192));
    }

    const feedback = !lastError
      ? ""
      : truncated
        ? "\n\nYour previous response was cut off at the token limit before the JSON " +
          "closed. Return the SAME JSON but more concisely (shorter prose in string " +
          "fields) so the whole value fits. Output only the JSON."
        : `\n\nYour previous response was invalid: ${lastError}\nReturn corrected JSON only.`;

    const instructions =
      "Respond with a single JSON value and nothing else (no prose, no markdown, " +
      `no code fences). It MUST validate against this JSON Schema:\n${schemaText}` +
      feedback;

    const { text, stopReason } = await complete({
      ...opts,
      maxTokens: budget,
      json: true,
      prompt: `${opts.prompt}\n\n${instructions}`,
    });
    lastText = text;
    truncated = stopReason === "max_tokens";

    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJson(text));
    } catch (e) {
      lastError = truncated
        ? "response was truncated at the output-token limit (JSON incomplete)"
        : `not valid JSON (${(e as Error).message})`;
      continue;
    }
    if (validate(parsed)) return parsed as T;
    lastError = ajv.errorsText(validate.errors, { separator: "; " });
  }

  throw new LlmError(
    `failed to produce schema-valid JSON after ${JSON_MAX_RETRIES + 1} attempts: ${lastError}` +
      (lastText ? `\n--- last output ---\n${lastText.slice(0, 500)}` : ""),
  );
}
