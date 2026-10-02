import { Context, Data, type Effect } from "effect";

import { type LogClickEvent } from "./schema";

export class QueuePublishError extends Data.TaggedError("QueuePublishError")<{
  readonly cause: unknown;
}> {}

export class ClickQueue extends Context.Service<
  ClickQueue,
  {
    readonly publish: (
      event: LogClickEvent,
    ) => Effect.Effect<void, QueuePublishError>;
  }
>()("ClickQueue") {}
