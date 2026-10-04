import { type RedirectTarget } from "@/server/db/types";

export type CacheEntry =
  | { found: false }
  | { found: true; target: RedirectTarget };

export type RedirectLookupDeps = {
  cacheGet(code: string): Promise<CacheEntry | null>;
  cachePut(code: string, entry: CacheEntry, ttlSeconds: number): Promise<void>;
  kvGet(code: string): Promise<RedirectTarget | null>;
  kvPut(code: string, target: RedirectTarget): Promise<void>;
  dbGet(code: string): Promise<RedirectTarget | null>;
};

const POSITIVE_TTL_SECONDS = 60;
const NEGATIVE_TTL_SECONDS = 5;

export async function resolveRedirectTarget(
  code: string,
  deps: RedirectLookupDeps,
): Promise<RedirectTarget | null> {
  const cached = await deps.cacheGet(code).catch(() => null);
  if (cached?.found === false) return null;
  if (cached?.found === true) return cached.target;

  const fromKv = await deps.kvGet(code).catch(() => null);
  if (fromKv) {
    await deps
      .cachePut(code, { found: true, target: fromKv }, POSITIVE_TTL_SECONDS)
      .catch(() => undefined);
    return fromKv;
  }

  const fromDb = await deps.dbGet(code);
  if (!fromDb) {
    await deps
      .cachePut(code, { found: false }, NEGATIVE_TTL_SECONDS)
      .catch(() => undefined);
    return null;
  }

  await deps.kvPut(code, fromDb).catch(() => undefined);
  await deps
    .cachePut(code, { found: true, target: fromDb }, POSITIVE_TTL_SECONDS)
    .catch(() => undefined);
  return fromDb;
}

export type RedirectDecision =
  | { kind: "redirect"; url: string }
  | { kind: "missing" }
  | { kind: "expired" };

export function redirectDecision(
  target: RedirectTarget | null,
  now = new Date(),
): RedirectDecision {
  if (!target) return { kind: "missing" };
  if (target.expiresAt && now > target.expiresAt) return { kind: "expired" };
  return { kind: "redirect", url: target.url };
}

export async function trackClick(
  publish: () => Promise<unknown>,
  write: () => unknown,
) {
  await Promise.allSettled([publish(), Promise.resolve().then(write)]);
}
