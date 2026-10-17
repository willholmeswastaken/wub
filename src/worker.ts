import { withWaitUntil } from "@/server/after-response";
import { consumeAlertEmailMessage } from "@/server/alerts/consume-email";
import { ALERT_EMAIL_QUEUE } from "@/server/alerts/deliver";
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
  readonly queue?: string;
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
    const deliverEmail = (batch.queue ?? "").includes(ALERT_EMAIL_QUEUE);
    await mapWithConcurrency(
      batch.messages,
      QUEUE_CONCURRENCY,
      async (message) => {
        try {
          if (deliverEmail) {
            await consumeAlertEmailMessage(message.body);
          } else {
            await consumeClickMessage(message.body);
          }
          message.ack();
        } catch (error) {
          logger.info(
            { error, queue: batch.queue },
            deliverEmail
              ? "Alert email failed, retrying"
              : "Click queue message failed, retrying",
          );
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
