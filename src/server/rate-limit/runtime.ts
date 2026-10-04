import { env } from "@/env";
import { ManagedRuntime } from "effect";

import { type RateLimitProvider, resolveRateLimitProvider } from "./provider";
import { RateLimiter } from "./rate-limiter";

type RateLimiterRuntime = ManagedRuntime.ManagedRuntime<RateLimiter, never>;

let rateLimiterRuntimePromise: Promise<RateLimiterRuntime> | undefined;

export function getRateLimitProvider(): RateLimitProvider {
  return resolveRateLimitProvider(env.RATE_LIMIT_PROVIDER);
}

export async function getRateLimiterRuntime(): Promise<RateLimiterRuntime> {
  rateLimiterRuntimePromise ??= (async () => {
    const provider = getRateLimitProvider();
    const layer =
      provider === "cloudflare"
        ? (await import("./cloudflare")).CloudflareRateLimiterLive
        : (await import("./upstash")).UpstashRateLimiterLive;
    return ManagedRuntime.make(layer);
  })();
  return rateLimiterRuntimePromise;
}

export async function limitByIdentifier(identifier: string) {
  const runtime = await getRateLimiterRuntime();
  return runtime.runPromise(
    RateLimiter.use((limiter) => limiter.limit(identifier)),
  );
}
