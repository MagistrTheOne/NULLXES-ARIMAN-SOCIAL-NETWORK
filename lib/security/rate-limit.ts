type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const DEFAULT_MAX = 120;

export function rateLimitSync(
  key: string,
  max: number = DEFAULT_MAX,
  windowMs: number = WINDOW_MS,
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  let bucket = store.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    store.set(key, bucket);
  }
  if (bucket.count >= max) {
    return { ok: false, retryAfterMs: Math.max(0, bucket.resetAt - now) };
  }
  bucket.count += 1;
  return { ok: true };
}
