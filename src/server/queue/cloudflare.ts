import { env as workersEnv } from "cloudflare:workers";
import { Effect, Layer } from "effect";

import { ClickQueue, QueuePublishError } from "./click-queue";
import { type LogClickEvent } from "./schema";

type ClickQueueBinding = {
  send: (body: LogClickEvent) => Promise<unknown>;
};

function getClickQueueBinding(): ClickQueueBinding {
  const queue = (workersEnv as { CLICK_QUEUE?: ClickQueueBinding }).CLICK_QUEUE;
  if (!queue) {
    throw new Error("CLICK_QUEUE binding is missing");
  }
  return queue;
}

export const CloudflareClickQueueLive = Layer.succeed(ClickQueue, {
  publish: (event: LogClickEvent) =>
    Effect.tryPromise({
      try: () => getClickQueueBinding().send(event),
      catch: (cause) => new QueuePublishError({ cause }),
    }).pipe(Effect.asVoid),
});
