import { expect, test } from "bun:test";

import {
  readUnsubscribeToken,
  signUnsubscribeToken,
} from "@/server/alerts/unsubscribe-token";

test("an unsubscribe token round-trips and rejects tampering", async () => {
  const token = await signUnsubscribeToken("user-1", "secret");
  expect(await readUnsubscribeToken(token, "secret")).toBe("user-1");
  expect(await readUnsubscribeToken(token, "other-secret")).toBeNull();
  expect(await readUnsubscribeToken(`${token}x`, "secret")).toBeNull();
  expect(await readUnsubscribeToken("not-a-token", "secret")).toBeNull();
});
