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

export default {
  fetch(request: Request, env: unknown, ctx: unknown) {
    return handler.fetch(request, env, ctx);
  },
  async queue(batch: ClickMessageBatch) {
    for (const message of batch.messages) {
      try {
        await consumeClickMessage(message.body);
        message.ack();
      } catch (error) {
        logger.info({ error }, "Click queue message failed, retrying");
        message.retry();
      }
    }
  },
};
