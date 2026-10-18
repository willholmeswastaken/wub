function unavailable(name: string): never {
  throw new Error(`${name} is not included in the Cloudflare Worker bundle`);
}

export const NeonAppDatabaseLive = new Proxy(
  {},
  { get: () => unavailable("Neon") },
);

export const UpstashRateLimiterLive = new Proxy(
  {},
  { get: () => unavailable("Upstash") },
);

export const QStashClickQueueLive = new Proxy(
  {},
  { get: () => unavailable("QStash") },
);

export function verifySignatureAppRouter() {
  return () =>
    new Response(
      "QStash consumer is not included in the Cloudflare Worker bundle",
      {
        status: 404,
      },
    );
}
