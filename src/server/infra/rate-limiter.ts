import { RateLimited } from "@/server/errors";
import { isRateLimitAllowed } from "@/server/rate-limit";
import { Context, Effect, Layer } from "effect";

export class RateLimiter extends Context.Tag("RateLimiter")<
  RateLimiter,
  {
    readonly allow: (
      identifier: string | null,
    ) => Effect.Effect<void, RateLimited>;
  }
>() {}

export const RateLimiterLive = Layer.succeed(RateLimiter, {
  allow: (identifier) =>
    Effect.gen(function* () {
      const allowed = yield* Effect.tryPromise({
        try: () => isRateLimitAllowed(identifier),
        catch: () => new RateLimited({ message: "Unable to process request" }),
      });
      if (!allowed) {
        return yield* Effect.fail(
          new RateLimited({ message: "Unable to process request" }),
        );
      }
    }),
});
