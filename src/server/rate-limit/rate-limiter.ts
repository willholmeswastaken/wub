import { Context, Data, type Effect } from "effect";

export class RateLimitUnavailable extends Data.TaggedError(
  "RateLimitUnavailable",
)<{
  readonly cause: unknown;
}> {}

export class RateLimiter extends Context.Service<
  RateLimiter,
  {
    readonly limit: (
      identifier: string,
    ) => Effect.Effect<{ success: boolean }, RateLimitUnavailable>;
  }
>()("RateLimiter") {}
