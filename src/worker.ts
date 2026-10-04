import { withWaitUntil } from "@/server/after-response";
import { deleteExpiredGuestLinks } from "@/server/db";
import logger from "@/server/logger";
import { consumeClickMessage } from "@/server/queue/runtime";
import handler from "vinext/server/fetch-handler";

type QueueMessage = {
  readonly body: unknown;
  ack(): void;
  retry(): void;
};

type ClickMessageBatch = {
  readonly messages: readonly QueueMessage[];
};

type ExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

const QUEUE_CONCURRENCY = 8;

async function mapWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  run: (item: T) => Promise<void>,
) {
  let next = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (next < items.length) {
        const index = next;
        next += 1;
        const item = items[index];
        if (item !== undefined) await run(item);
      }
    },
  );
  await Promise.all(workers);
}

export default {
  fetch(request: Request, env: unknown, ctx: ExecutionContext) {
    return withWaitUntil(
      (promise) => ctx.waitUntil(promise),
      () => handler.fetch(request, env, ctx),
    );
  },
  async queue(batch: ClickMessageBatch) {
    await mapWithConcurrency(
      batch.messages,
      QUEUE_CONCURRENCY,
      async (message) => {
        try {
          await consumeClickMessage(message.body);
          message.ack();
        } catch (error) {
          logger.info({ error }, "Click queue message failed, retrying");
          message.retry();
        }
      },
    );
  },
  async scheduled() {
    try {
      const removed = await deleteExpiredGuestLinks();
      logger.info({ removed: removed.length }, "Expired guest links purged");
    } catch (error) {
      logger.info({ error }, "Expired guest link purge failed");
    }
  },
};
