import { Context, Data, type Effect } from "effect";

export class RateLimitUnavailable extends Data.TaggedError(
  "RateLimitUnavailable",
)<{
  readonly cause: unknown;
}> {}

export type RateLimitScope = "create" | "redirect";

export class RateLimiter extends Context.Service<
  RateLimiter,
  {
    readonly limit: (
      identifier: string,
      scope: RateLimitScope,
    ) => Effect.Effect<{ success: boolean }, RateLimitUnavailable>;
  }
>()("RateLimiter") {}
