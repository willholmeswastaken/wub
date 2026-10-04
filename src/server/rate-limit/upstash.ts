import { env } from "@/env";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { Effect, Layer } from "effect";

import { RateLimiter, RateLimitUnavailable } from "./rate-limiter";

let ratelimit: Ratelimit | undefined;

function getRatelimit() {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required when RATE_LIMIT_PROVIDER=upstash",
    );
  }

  // Keep in sync with LINK_RATE_LIMITER in cloudflare.config.ts: 10 requests / 10 seconds.
  ratelimit ??= new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(10, "10 s"),
    analytics: true,
    prefix: "@upstash/ratelimit",
  });
  return ratelimit;
}

export const UpstashRateLimiterLive = Layer.succeed(RateLimiter, {
  limit: (identifier: string) =>
    Effect.tryPromise({
      try: async () => {
        const { success } = await getRatelimit().limit(identifier);
        return { success };
      },
      catch: (cause) => new RateLimitUnavailable({ cause }),
    }),
});
