export const DATABASE_PROVIDERS = ["neon", "cloudflare"] as const;

export type DatabaseProvider = (typeof DATABASE_PROVIDERS)[number];

export function isCloudflareWorker() {
  return (
    typeof navigator !== "undefined" &&
    navigator.userAgent === "Cloudflare-Workers"
  );
}

export function defaultDatabaseProvider(): DatabaseProvider {
  return isCloudflareWorker() ? "cloudflare" : "neon";
}

export function resolveDatabaseProvider(
  explicit?: DatabaseProvider,
): DatabaseProvider {
  return explicit ?? defaultDatabaseProvider();
}
