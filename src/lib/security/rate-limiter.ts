import "server-only";

/**
 * In-memory sliding-window rate limiter keyed by IP (or any string).
 * Note: state lives per-worker-instance — distributed limits would need a shared
 * KV/durable object. For an additive hardening pass this provides meaningful
 * protection against brute-force from a single source.
 */
interface Window {
  hits: number[];
}

const buckets = new Map<string, Window>();

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  // Drop expired hits.
  bucket.hits = bucket.hits.filter((t) => now - t < opts.windowMs);

  if (bucket.hits.length >= opts.max) {
    const oldest = bucket.hits[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      resetMs: Math.max(0, opts.windowMs - (now - oldest)),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return {
    allowed: true,
    remaining: opts.max - bucket.hits.length,
    resetMs: opts.windowMs,
  };
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}

// Periodic cleanup of stale buckets to avoid unbounded memory growth.
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

export function maybeSweep(maxAgeMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets.entries()) {
    bucket.hits = bucket.hits.filter((t) => now - t < maxAgeMs);
    if (bucket.hits.length === 0) buckets.delete(key);
  }
}
