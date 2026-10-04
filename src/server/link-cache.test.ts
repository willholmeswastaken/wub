import { expect, test } from "bun:test";

import { type RedirectTarget } from "@/server/db/types";
import {
  redirectDecision,
  resolveRedirectTarget,
  trackClick,
  type CacheEntry,
  type RedirectLookupDeps,
} from "@/server/link-cache";

const target: RedirectTarget = {
  url: "https://example.com/docs",
  expiresAt: null,
};

function deps(
  overrides: Partial<RedirectLookupDeps> = {},
): RedirectLookupDeps & {
  cacheWrites: CacheEntry[];
  kvWrites: RedirectTarget[];
} {
  const cacheWrites: CacheEntry[] = [];
  const kvWrites: RedirectTarget[] = [];
  return {
    cacheWrites,
    kvWrites,
    cacheGet: async () => null,
    cachePut: async (_code, entry) => {
      cacheWrites.push(entry);
    },
    kvGet: async () => null,
    kvPut: async (_code, value) => {
      kvWrites.push(value);
    },
    dbGet: async () => null,
    ...overrides,
  };
}

test("redirect lookup uses the colo cache before KV or D1", async () => {
  const lookup = deps({
    cacheGet: async () => ({ found: true, target }),
    kvGet: async () => {
      throw new Error("kv");
    },
    dbGet: async () => {
      throw new Error("db");
    },
  });
  await expect(resolveRedirectTarget("abc", lookup)).resolves.toEqual(target);
  expect(lookup.kvWrites).toHaveLength(0);
});

test("redirect lookup fills the colo cache from KV without reading D1", async () => {
  let dbReads = 0;
  const lookup = deps({
    kvGet: async () => target,
    dbGet: async () => {
      dbReads += 1;
      return null;
    },
  });
  await expect(resolveRedirectTarget("abc", lookup)).resolves.toEqual(target);
  expect(dbReads).toBe(0);
  expect(lookup.cacheWrites).toEqual([{ found: true, target }]);
  expect(lookup.kvWrites).toHaveLength(0);
});

test("redirect lookup falls through to D1 and fills both caches", async () => {
  const lookup = deps({
    dbGet: async () => target,
  });
  await expect(resolveRedirectTarget("abc", lookup)).resolves.toEqual(target);
  expect(lookup.kvWrites).toEqual([target]);
  expect(lookup.cacheWrites).toEqual([{ found: true, target }]);
});

test("a missing code is negatively cached only in the colo cache", async () => {
  const lookup = deps();
  await expect(resolveRedirectTarget("missing", lookup)).resolves.toBeNull();
  expect(lookup.cacheWrites).toEqual([{ found: false }]);
  expect(lookup.kvWrites).toHaveLength(0);
});

test("a negative colo cache does not read KV", async () => {
  let kvReads = 0;
  const lookup = deps({
    cacheGet: async () => ({ found: false }),
    kvGet: async () => {
      kvReads += 1;
      return target;
    },
  });
  await expect(resolveRedirectTarget("missing", lookup)).resolves.toBeNull();
  expect(kvReads).toBe(0);
});

test("redirect decision ignores a failed click publish", async () => {
  const decision = redirectDecision(target);
  expect(decision).toEqual({
    kind: "redirect",
    url: "https://example.com/docs",
  });
  await trackClick(
    async () => {
      throw new Error("queue down");
    },
    () => {
      throw new Error("analytics down");
    },
  );
  expect(decision.kind).toBe("redirect");
});

test("expired and missing links do not redirect", () => {
  expect(redirectDecision(null)).toEqual({ kind: "missing" });
  expect(
    redirectDecision(
      {
        url: "https://example.com",
        expiresAt: new Date("2020-01-01T00:00:00Z"),
      },
      new Date("2024-01-01T00:00:00Z"),
    ),
  ).toEqual({ kind: "expired" });
});
