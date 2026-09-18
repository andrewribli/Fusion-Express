/**
 * Simple in-memory rate limiter for API routes.
 *
 * Limitation: on Vercel this is per-instance only. Warm serverless isolates do
 * not share Maps, so an attacker can partially reset limits by hitting cold
 * instances. Good enough as a first pass; replace with Redis/Upstash for
 * multi-instance enforcement.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const MAX_KEYS = 20_000;

function pruneIfNeeded() {
  if (buckets.size < MAX_KEYS) return;
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size < MAX_KEYS) return;
  // Drop oldest half if still oversized.
  let i = 0;
  for (const key of buckets.keys()) {
    if (i++ % 2 === 0) buckets.delete(key);
  }
}

/** Returns true when the request is allowed; false when limited. */
export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  pruneIfNeeded();
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 128);
  return "unknown";
}
