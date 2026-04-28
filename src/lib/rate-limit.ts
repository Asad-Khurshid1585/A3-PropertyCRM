type Bucket = {
  count: number;
  resetAt: number;
};

const globalStore = globalThis as typeof globalThis & {
  crmRateLimiter?: Map<string, Bucket>;
};

const store = globalStore.crmRateLimiter || new Map<string, Bucket>();
globalStore.crmRateLimiter = store;

const RATE_LIMIT_WINDOWS = {
  DEFAULT: 60_000,
  STRICT: 15_000,
  GENEROUS: 300_000,
} as const;

export const applyRateLimit = (
  key: string,
  limit: number,
  windowMs = RATE_LIMIT_WINDOWS.DEFAULT,
) => {
  if (limit <= 0) {
    return { allowed: true, remaining: Number.MAX_SAFE_INTEGER };
  }

  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: current.resetAt - now };
  }

  current.count += 1;
  store.set(key, current);

  return { allowed: true, remaining: Math.max(0, limit - current.count) };
};

export const clearRateLimitStore = () => {
  store.clear();
};

export const getRateLimitStatus = (key: string) => {
  return store.get(key);
};
