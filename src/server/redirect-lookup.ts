import { findRedirectTarget, getDatabaseProvider } from "@/server/db";

import { resolveRedirectTarget } from "./link-cache";

export async function lookupRedirect(code: string) {
  if (getDatabaseProvider() !== "cloudflare") {
    return findRedirectTarget(code);
  }
  const kv = await import("./kv-links");
  return resolveRedirectTarget(code, {
    cacheGet: kv.readCachedRedirect,
    cachePut: kv.writeCachedRedirect,
    kvGet: kv.readKvRedirect,
    kvPut: kv.writeKvRedirect,
    dbGet: (shortCode) => findRedirectTarget(shortCode),
  });
}
