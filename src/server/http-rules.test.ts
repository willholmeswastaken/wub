import { expect, test } from "bun:test";

import { getShortcode } from "@/lib/short-code";
import { destinationUrlSchema } from "@/lib/url";
import {
  isLinkConflictError,
  isUniqueViolation,
  LinkConflictError,
} from "@/server/db/conflicts";
import { clientIp } from "@/server/rate-limit/client-ip";

test("short codes come from a cryptographic generator", () => {
  const code = getShortcode();
  expect(code).toHaveLength(8);
  expect(code).toMatch(/^[a-zA-Z0-9]+$/);
});

test("destination URLs are http(s) only and length capped", () => {
  expect(destinationUrlSchema.safeParse("https://example.com/a").success).toBe(
    true,
  );
  expect(destinationUrlSchema.safeParse("http://example.com").success).toBe(
    true,
  );
  expect(destinationUrlSchema.safeParse("javascript:alert(1)").success).toBe(
    false,
  );
  expect(destinationUrlSchema.safeParse("https://localhost").success).toBe(
    false,
  );
  expect(
    destinationUrlSchema.safeParse(`https://example.com/${"a".repeat(2048)}`)
      .success,
  ).toBe(false);
});

test("unique violations are link conflicts", () => {
  expect(
    isUniqueViolation(
      new Error("UNIQUE constraint failed: wub_link.short_code"),
    ),
  ).toBe(true);
  expect(
    isUniqueViolation(
      new Error("duplicate key value violates unique constraint"),
    ),
  ).toBe(true);
  expect(isLinkConflictError(new LinkConflictError())).toBe(true);
  expect(isLinkConflictError(new Error("nope"))).toBe(false);
});

test("client identity prefers the cloudflare connecting ip", () => {
  const headers = new Headers({
    "cf-connecting-ip": "1.1.1.1",
    "x-forwarded-for": "9.9.9.9, 8.8.8.8",
  });
  expect(clientIp(headers)).toBe("1.1.1.1");
  expect(
    clientIp(
      new Headers({
        "x-forwarded-for": "9.9.9.9",
        "x-real-ip": "2.2.2.2",
      }),
    ),
  ).toBe("2.2.2.2");
  expect(clientIp(new Headers({ "x-forwarded-for": "9.9.9.9" }))).toBeNull();
});
