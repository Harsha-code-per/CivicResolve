interface RateLimitDecision {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
}

export interface RateLimiter {
  check(key: string, nowMs?: number): RateLimitDecision;
}

/**
 * Creates a bounded in-memory sliding-window rate limiter safe against key-flooding.
 *
 * @param maxRequests - Maximum requests permitted within windowMs.
 * @param windowMs - Rolling window duration in milliseconds.
 * @param maxKeys - Maximum distinct keys tracked before evicting the oldest entry.
 * @returns RateLimiter instance.
 */
export function createRateLimiter(
  maxRequests: number,
  windowMs: number,
  maxKeys = 2000,
): RateLimiter {
  const buckets = new Map<string, number[]>();

  return {
    check(key: string, nowMs = Date.now()): RateLimitDecision {
      const cutoff = nowMs - windowMs;
      const existing = (buckets.get(key) ?? []).filter((ts) => ts > cutoff);

      if (existing.length >= maxRequests) {
        const oldest = existing[0] ?? nowMs;
        const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - nowMs) / 1000));
        buckets.set(key, existing);
        return { allowed: false, remaining: 0, retryAfterSeconds };
      }

      if (!buckets.has(key) && buckets.size >= maxKeys) {
        const firstKey = buckets.keys().next().value;
        if (firstKey !== undefined) buckets.delete(firstKey);
      }

      existing.push(nowMs);
      buckets.set(key, existing);
      return {
        allowed: true,
        remaining: Math.max(0, maxRequests - existing.length),
        retryAfterSeconds: 0,
      };
    },
  };
}
