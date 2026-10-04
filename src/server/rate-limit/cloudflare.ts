import { env as workersEnv } from "cloudflare:workers";
import { Effect, Layer } from "effect";

import { RateLimiter, RateLimitUnavailable } from "./rate-limiter";

type RateLimitBinding = {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
};

function getRateLimitBinding(scope: "create" | "redirect"): RateLimitBinding {
  const env = workersEnv as {
    LINK_RATE_LIMITER?: RateLimitBinding;
    REDIRECT_RATE_LIMITER?: RateLimitBinding;
  };
  const limiter =
    scope === "redirect" ? env.REDIRECT_RATE_LIMITER : env.LINK_RATE_LIMITER;
  if (!limiter) {
    throw new Error(
      scope === "redirect"
        ? "REDIRECT_RATE_LIMITER binding is missing"
        : "LINK_RATE_LIMITER binding is missing",
    );
  }
  return limiter;
}

export const CloudflareRateLimiterLive = Layer.succeed(RateLimiter, {
  limit: (identifier, scope) =>
    Effect.tryPromise({
      try: () => getRateLimitBinding(scope).limit({ key: identifier }),
      catch: (cause) => new RateLimitUnavailable({ cause }),
    }),
});
