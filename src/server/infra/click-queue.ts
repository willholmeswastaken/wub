import { DatabaseError } from "@/server/errors";
import { type LogClickEvent, queueClient } from "@/server/qstash";
import { Context, Effect, Layer } from "effect";

export class ClickQueue extends Context.Tag("ClickQueue")<
  ClickQueue,
  {
    readonly publish: (
      event: LogClickEvent,
    ) => Effect.Effect<void, DatabaseError>;
  }
>() {}

export const ClickQueueLive = Layer.succeed(ClickQueue, {
  publish: (event) =>
    Effect.tryPromise({
      try: () => queueClient.logClick(event),
      catch: (cause) =>
        new DatabaseError({ cause, message: "Queue publish failed" }),
    }),
});
