import { env as workersEnv } from "cloudflare:workers";
import { Effect, Layer } from "effect";

import { RateLimiter, RateLimitUnavailable } from "./rate-limiter";

type RateLimitBinding = {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
};

function getRateLimitBinding(): RateLimitBinding {
  const limiter = (workersEnv as { LINK_RATE_LIMITER?: RateLimitBinding })
    .LINK_RATE_LIMITER;
  if (!limiter) {
    throw new Error("LINK_RATE_LIMITER binding is missing");
  }
  return limiter;
}

export const CloudflareRateLimiterLive = Layer.succeed(RateLimiter, {
  limit: (identifier: string) =>
    Effect.tryPromise({
      try: () => getRateLimitBinding().limit({ key: identifier }),
      catch: (cause) => new RateLimitUnavailable({ cause }),
    }),
});
