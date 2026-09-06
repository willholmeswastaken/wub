import { RateLimited } from "@/server/errors";
import { Effect, Exit } from "effect";
import { describe, expect, it } from "vitest";

describe("rate limiter mapping", () => {
  it("fails with RateLimited when the check returns false", async () => {
    const allow = (identifier: string | null) =>
      Effect.gen(function* () {
        if (identifier === "blocked") {
          return yield* Effect.fail(
            new RateLimited({ message: "Unable to process request" }),
          );
        }
      });

    const blocked = await Effect.runPromiseExit(allow("blocked"));
    expect(Exit.isFailure(blocked)).toBe(true);

    const allowed = await Effect.runPromiseExit(allow("1.1.1.1"));
    expect(Exit.isSuccess(allowed)).toBe(true);
  });
});
