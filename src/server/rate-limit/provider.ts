export const RATE_LIMIT_PROVIDERS = ["upstash", "cloudflare"] as const;

export type RateLimitProvider = (typeof RATE_LIMIT_PROVIDERS)[number];

export function isCloudflareWorker() {
  return (
    typeof navigator !== "undefined" &&
    navigator.userAgent === "Cloudflare-Workers"
  );
}

export function defaultRateLimitProvider(): RateLimitProvider {
  return isCloudflareWorker() ? "cloudflare" : "upstash";
}

export function resolveRateLimitProvider(
  explicit?: RateLimitProvider,
): RateLimitProvider {
  return explicit ?? defaultRateLimitProvider();
}
