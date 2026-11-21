import { createHash } from 'node:crypto';
import { reconcileTriage, triageDeterministic } from '../../src/domain/priority.js';
import { aiTriageOutputSchema, type TriagePreviewInput } from '../../src/domain/schemas.js';
import type { TriageResult } from '../../src/domain/types.js';
import { decodeImageDataUrl } from '../lib/images.js';
import type { TriageModel, TriageRequest } from './model.js';
import { buildFencedTriagePrompt, TRIAGE_JSON_SCHEMA, TRIAGE_SYSTEM_PROMPT } from './prompts.js';

export interface AiTriageClient {
  analyze(input: TriagePreviewInput): Promise<TriageResult>;
}

export interface TriageClientOptions {
  readonly timeoutMs?: number;
  readonly cooldownMs?: number;
  readonly cacheSize?: number;
  readonly now?: () => number;
}

const DEFAULT_TIMEOUT_MS = 12_000;
/** A model that failed (quota, outage, timeout) is skipped for a minute instead of retried. */
const DEFAULT_COOLDOWN_MS = 60_000;
const DEFAULT_CACHE_SIZE = 200;

/**
 * Hashes every field (including the whole photo) so identical complaints share one Gemini answer.
 *
 * @param input - Citizen complaint fields.
 * @returns Hex SHA-256 digest.
 */
function cacheKeyFor(input: TriagePreviewInput): string {
  return createHash('sha256')
    .update(
      JSON.stringify([
        input.title,
        input.description,
        input.location,
        input.category,
        input.imageDataUrl,
      ]),
    )
    .digest('hex');
}

/**
 * Builds the model request for a complaint, attaching the photo when present.
 *
 * @param input - Validated citizen complaint.
 * @returns TriageRequest for any model in the cascade.
 */
function buildRequest(input: TriagePreviewInput): TriageRequest {
  const image = input.imageDataUrl ? decodeImageDataUrl(input.imageDataUrl) : undefined;
  return {
    system: TRIAGE_SYSTEM_PROMPT,
    prompt: buildFencedTriagePrompt(input),
    schema: TRIAGE_JSON_SCHEMA,
    ...(image ? { image: { mimeType: image.mimeType, base64: image.base64 } } : {}),
  };
}

/**
 * Asks one model and validates its JSON against the zod schema.
 *
 * @param model - Model to call.
 * @param request - Prepared request.
 * @param timeoutMs - Abort after this many milliseconds.
 * @returns Parsed AI output, or undefined if the reply is missing or malformed.
 */
async function askModel(model: TriageModel, request: TriageRequest, timeoutMs: number) {
  const text = await model.generate(request, AbortSignal.timeout(timeoutMs));
  const parsed = aiTriageOutputSchema.safeParse(JSON.parse(text));
  return parsed.success ? parsed.data : undefined;
}

/**
 * Creates the triage service: cache, then each Gemini model in turn, then the rule engine.
 *
 * Whatever happens upstream, every complaint gets a complete triage and the result
 * always says which engine produced it.
 *
 * @param models - Models to try in order (empty when no API key is configured).
 * @param options - Timeout, cooldown, cache size and clock.
 * @returns AiTriageClient.
 */
export function createAiTriageClient(
  models: readonly TriageModel[],
  options: TriageClientOptions = {},
): AiTriageClient {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const cacheSize = options.cacheSize ?? DEFAULT_CACHE_SIZE;
  const now = options.now ?? Date.now;
  const cache = new Map<string, TriageResult>();
  const coolingUntil = new Map<string, number>();

  const remember = (key: string, result: TriageResult): TriageResult => {
    if (cache.size >= cacheSize) {
      // Maps iterate in insertion order, so the first key is the oldest entry.
      for (const oldest of cache.keys()) {
        cache.delete(oldest);
        break;
      }
    }
    cache.set(key, result);
    return result;
  };

  const cascade = async (input: TriagePreviewInput, rules: TriageResult) => {
    const request = buildRequest(input);
    for (const model of models) {
      if ((coolingUntil.get(model.name) ?? 0) > now()) continue;
      try {
        const output = await askModel(model, request, timeoutMs);
        if (output) return reconcileTriage(output, rules, model.name);
      } catch {
        coolingUntil.set(model.name, now() + cooldownMs);
      }
    }
    return undefined;
  };

  return {
    async analyze(input) {
      const key = cacheKeyFor(input);
      const cached = cache.get(key);
      if (cached) return cached;
      const rules = triageDeterministic({
        title: input.title,
        description: input.description,
        location: input.location,
        hasPhoto: Boolean(input.imageDataUrl),
        ...(input.category ? { category: input.category } : {}),
      });
      const ai = await cascade(input, rules);
      return ai ? remember(key, ai) : rules;
    },
  };
}
