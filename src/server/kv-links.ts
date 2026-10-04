import { type RedirectTarget } from "@/server/db/types";
import logger from "@/server/logger";
import { env as workersEnv } from "cloudflare:workers";

const CACHE_ORIGIN = "https://link-cache.wub.internal";
const POSITIVE_TTL_SECONDS = 60;

type LinkKv = {
  get(key: string, type: "json"): Promise<StoredTarget | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
};

type StoredTarget = {
  url: string;
  expiresAt: number | null;
};

function linkKv(): LinkKv | null {
  const namespace = (workersEnv as { LINKS?: LinkKv }).LINKS;
  return namespace ?? null;
}

function cacheRequest(code: string) {
  return new Request(`${CACHE_ORIGIN}/${encodeURIComponent(code)}`);
}

function cacheStore(): Cache | null {
  const cacheStorage = (globalThis as { caches?: { default?: Cache } }).caches;
  return cacheStorage?.default ?? null;
}

function storedFromTarget(target: RedirectTarget): StoredTarget {
  return {
    url: target.url,
    expiresAt: target.expiresAt ? target.expiresAt.getTime() : null,
  };
}

function targetFromStored(stored: StoredTarget): RedirectTarget {
  return {
    url: stored.url,
    expiresAt: stored.expiresAt == null ? null : new Date(stored.expiresAt),
  };
}

export async function readCachedRedirect(code: string) {
  const cache = cacheStore();
  if (!cache) return null;
  const response = await cache.match(cacheRequest(code));
  if (!response) return null;
  if (response.headers.get("x-wub-negative") === "1") {
    return { found: false as const };
  }
  const stored = (await response.json()) as StoredTarget;
  return { found: true as const, target: targetFromStored(stored) };
}

export async function writeCachedRedirect(
  code: string,
  entry: { found: false } | { found: true; target: RedirectTarget },
  ttlSeconds: number,
) {
  const cache = cacheStore();
  if (!cache) return;
  const response =
    entry.found === false
      ? new Response(null, {
          headers: {
            "Cache-Control": `max-age=${ttlSeconds}`,
            "x-wub-negative": "1",
          },
        })
      : new Response(JSON.stringify(storedFromTarget(entry.target)), {
          headers: {
            "Cache-Control": `max-age=${ttlSeconds}`,
            "content-type": "application/json",
          },
        });
  await cache.put(cacheRequest(code), response);
}

export async function readKvRedirect(code: string) {
  const kv = linkKv();
  if (!kv) return null;
  const stored = await kv.get(code, "json");
  return stored ? targetFromStored(stored) : null;
}

export async function writeKvRedirect(code: string, target: RedirectTarget) {
  const kv = linkKv();
  if (!kv) return;
  await kv.put(code, JSON.stringify(storedFromTarget(target)));
}

export async function rememberRedirectTarget(
  target: RedirectTarget & { code: string },
) {
  try {
    await writeKvRedirect(target.code, target);
    await writeCachedRedirect(
      target.code,
      { found: true, target },
      POSITIVE_TTL_SECONDS,
    );
  } catch (error) {
    logger.info(
      {
        short_code: target.code,
        message: error instanceof Error ? error.message : "cache",
      },
      "Redirect cache update failed",
    );
  }
}

export async function forgetRedirectTarget(code: string) {
  try {
    const kv = linkKv();
    if (kv) await kv.delete(code);
    const cache = cacheStore();
    if (cache) await cache.delete(cacheRequest(code));
  } catch (error) {
    logger.info(
      {
        short_code: code,
        message: error instanceof Error ? error.message : "cache",
      },
      "Redirect cache delete failed",
    );
  }
}
