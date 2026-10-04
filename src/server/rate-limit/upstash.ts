import { env } from "@/env";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { Effect, Layer } from "effect";

import { RateLimiter, RateLimitUnavailable } from "./rate-limiter";

const limiters = new Map<string, Ratelimit>();

function getRatelimit(scope: "create" | "redirect") {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required when RATE_LIMIT_PROVIDER=upstash",
    );
  }

  const existing = limiters.get(scope);
  if (existing) return existing;
  // Keep in sync with the Workers rate limit bindings in cloudflare.config.ts.
  const limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(scope === "redirect" ? 100 : 10, "10 s"),
    analytics: true,
    prefix:
      scope === "redirect"
        ? "@upstash/ratelimit-redirect"
        : "@upstash/ratelimit",
  });
  limiters.set(scope, limiter);
  return limiter;
}

export const UpstashRateLimiterLive = Layer.succeed(RateLimiter, {
  limit: (identifier, scope) =>
    Effect.tryPromise({
      try: async () => {
        const { success } = await getRatelimit(scope).limit(identifier);
        return { success };
      },
      catch: (cause) => new RateLimitUnavailable({ cause }),
    }),
});
