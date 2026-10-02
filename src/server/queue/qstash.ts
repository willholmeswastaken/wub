import { env } from "@/env";
import { Client } from "@upstash/qstash";
import { Effect, Layer } from "effect";

import { ClickQueue, QueuePublishError } from "./click-queue";
import { type LogClickEvent } from "./schema";

const QSTASH_CLICK_TOPIC = "wub.log_clicks";

function getQStashClient() {
  const token = env.QSTASH_TOKEN;
  if (!token) {
    throw new Error("QSTASH_TOKEN is required when QUEUE_PROVIDER=qstash");
  }
  return new Client({ token });
}

export const QStashClickQueueLive = Layer.succeed(ClickQueue, {
  publish: (event: LogClickEvent) =>
    Effect.tryPromise({
      try: () =>
        getQStashClient().publishJSON({
          topic: QSTASH_CLICK_TOPIC,
          body: event,
        }),
      catch: (cause) => new QueuePublishError({ cause }),
    }).pipe(Effect.asVoid),
});
