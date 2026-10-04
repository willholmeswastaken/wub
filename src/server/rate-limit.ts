import logger from "@/server/logger";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { Context, Data, Effect, Layer, ManagedRuntime } from "effect";

export class RateLimitError extends Data.TaggedError("RateLimitError")<{
  readonly cause: unknown;
}> {}

export type RateLimitDecision = "ok" | "limited";

export class RateLimiter extends Context.Service<
  RateLimiter,
  {
    readonly check: (
      identifier: string,
    ) => Effect.Effect<RateLimitDecision, RateLimitError>;
  }
>()("RateLimiter") {}

let ratelimit: Ratelimit | undefined;

function getRatelimit() {
  ratelimit ??= new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "10 s"),
    analytics: true,
    /**
     * Optional prefix for the keys used in redis. This is useful if you want to share a redis
     * instance with other applications and want to avoid key collisions. The default prefix is
     * "@upstash/ratelimit"
     */
    prefix: "@upstash/ratelimit",
  });
  return ratelimit;
}

export const UpstashRateLimiterLive = Layer.succeed(RateLimiter, {
  check: (identifier) =>
    Effect.tryPromise({
      try: () => getRatelimit().limit(identifier),
      catch: (cause) => new RateLimitError({ cause }),
    }).pipe(
      Effect.map(({ success }): RateLimitDecision =>
        success ? "ok" : "limited",
      ),
    ),
});

type RateLimiterRuntime = ManagedRuntime.ManagedRuntime<RateLimiter, never>;

let rateLimiterRuntime: RateLimiterRuntime | undefined;

function getRateLimiterRuntime() {
  rateLimiterRuntime ??= ManagedRuntime.make(UpstashRateLimiterLive);
  return rateLimiterRuntime;
}

export function clientIp(headers: Headers) {
  return headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for");
}

export async function protectRoute(identifier: string | null) {
  if (!identifier || identifier.length === 0) {
    logger.info("No ip address found to protect route");
    return true;
  }

  const decision = await getRateLimiterRuntime().runPromise(
    RateLimiter.use((limiter) => limiter.check(identifier)).pipe(
      Effect.catchTag("RateLimitError", (error) => Effect.die(error.cause)),
    ),
  );
  if (decision === "limited") {
    logger.info({ identifier }, "Rate limit exceeded");
    return true;
  }
  return false;
}
