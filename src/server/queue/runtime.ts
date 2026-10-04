import { env } from "@/env";
import { getDatabaseLayer } from "@/server/db";
import logger from "@/server/logger";
import { Layer, ManagedRuntime } from "effect";

import { ClickQueue } from "./click-queue";
import { type QueueProvider, resolveQueueProvider } from "./provider";
import {
  type ClickRecorder,
  ClickRecorderLive,
  recordClickOutcome,
} from "./record-click";
import { logClickEventSchema, type LogClickEvent } from "./schema";

type ClickQueueRuntime = ManagedRuntime.ManagedRuntime<ClickQueue, never>;
type ClickRecorderRuntime = ManagedRuntime.ManagedRuntime<ClickRecorder, never>;

let clickRecorderRuntimePromise: Promise<ClickRecorderRuntime> | undefined;

async function getClickRecorderRuntime() {
  clickRecorderRuntimePromise ??= (async () => {
    const databaseLayer = await getDatabaseLayer();
    return ManagedRuntime.make(
      ClickRecorderLive.pipe(Layer.provide(databaseLayer)),
    );
  })();
  return clickRecorderRuntimePromise;
}

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

export async function recordClick(event: LogClickEvent) {
  const runtime = await getClickRecorderRuntime();
  return runtime.runPromise(recordClickOutcome(event));
}

export async function consumeClickMessage(body: unknown) {
  const parsed = logClickEventSchema.safeParse(body);
  if (!parsed.success) {
    logger.info({ issues: parsed.error.flatten() }, "Invalid click event");
    return "invalid" as const;
  }

  return recordClick(parsed.data);
}

export { ClickQueue, recordClickOutcome };
