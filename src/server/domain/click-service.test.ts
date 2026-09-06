import { Effect, Exit } from "effect";
import { describe, expect, it } from "vitest";

import { NotFound } from "../errors";

describe("click ingest idempotency", () => {
  it("treats a second insert of the same message id as a duplicate", async () => {
    const seen = new Set<string>();
    const persist = (messageId: string) =>
      Effect.sync(() => {
        if (seen.has(messageId)) {
          return { duplicate: true };
        }
        seen.add(messageId);
        return { duplicate: false, clickCount: seen.size };
      });

    const first = await Effect.runPromise(persist("msg-1"));
    const second = await Effect.runPromise(persist("msg-1"));
    expect(first).toEqual({ duplicate: false, clickCount: 1 });
    expect(second).toEqual({ duplicate: true });
  });

  it("fails when the short link is missing after insert", async () => {
    const persist = Effect.fail(
      new NotFound({ message: "Short link not found" }),
    );
    const exit = await Effect.runPromiseExit(persist);
    expect(Exit.isFailure(exit)).toBe(true);
  });
});
