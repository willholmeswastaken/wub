export const QUEUE_PROVIDERS = ["qstash", "cloudflare"] as const;

export type QueueProvider = (typeof QUEUE_PROVIDERS)[number];

export function isCloudflareWorker() {
  return (
    typeof navigator !== "undefined" &&
    navigator.userAgent === "Cloudflare-Workers"
  );
}

export function defaultQueueProvider(): QueueProvider {
  return isCloudflareWorker() ? "cloudflare" : "qstash";
}

export function resolveQueueProvider(explicit?: QueueProvider): QueueProvider {
  return explicit ?? defaultQueueProvider();
}
