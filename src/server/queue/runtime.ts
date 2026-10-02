import { env } from "@/env";
import logger from "@/server/logger";
import { ManagedRuntime } from "effect";

import { ClickQueue } from "./click-queue";
import { type QueueProvider, resolveQueueProvider } from "./provider";
import { ClickRecorderLive, recordClickOutcome } from "./record-click";
import { logClickEventSchema, type LogClickEvent } from "./schema";

export const clickRecorderRuntime = ManagedRuntime.make(ClickRecorderLive);

type ClickQueueRuntime = ManagedRuntime.ManagedRuntime<ClickQueue, never>;

let clickQueueRuntimePromise: Promise<ClickQueueRuntime> | undefined;

export function getQueueProvider(): QueueProvider {
  return resolveQueueProvider(env.QUEUE_PROVIDER);
}

export async function getClickQueueRuntime(): Promise<ClickQueueRuntime> {
  clickQueueRuntimePromise ??= (async () => {
    const provider = getQueueProvider();
    const layer =
      provider === "cloudflare"
        ? (await import("./cloudflare")).CloudflareClickQueueLive
        : (await import("./qstash")).QStashClickQueueLive;
    return ManagedRuntime.make(layer);
  })();
  return clickQueueRuntimePromise;
}

export async function publishClick(event: LogClickEvent) {
  const runtime = await getClickQueueRuntime();
  return runtime.runPromise(ClickQueue.use((queue) => queue.publish(event)));
}

export async function consumeClickMessage(body: unknown) {
  const parsed = logClickEventSchema.safeParse(body);
  if (!parsed.success) {
    logger.info({ issues: parsed.error.flatten() }, "Invalid click event");
    return "invalid" as const;
  }

  return clickRecorderRuntime.runPromise(recordClickOutcome(parsed.data));
}

export { ClickQueue, recordClickOutcome };
