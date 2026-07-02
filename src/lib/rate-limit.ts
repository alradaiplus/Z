import "server-only";

// Best-effort fixed-window rate limiter kept in process memory.
//
// NOTE: on serverless (Vercel) each instance has its own memory, so this only
// throttles bursts hitting the same warm instance — useful, but not a hard
// guarantee. For production-grade limiting, back this with Upstash Redis
// (@upstash/ratelimit) using the same interface.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Periodically drop expired buckets so the map doesn't grow unbounded.
function sweep(now: number) {
  if (buckets.size < 5_000) return;
  for (const [key, b] of buckets) {
    if (b.resetAt < now) buckets.delete(key);
  }
}

/**
 * Returns true if the action is allowed, false if the caller is over the limit.
 * @param key    identifier (e.g. `login:<ip-or-email>`)
 * @param max    max attempts per window
 * @param windowMs window length in ms
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count++;
  return true;
}
