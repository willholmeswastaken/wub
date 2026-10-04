import {
  AppDatabase,
  ClickNotFoundError,
  RecordClickError,
} from "@/server/db/database";
import logger from "@/server/logger";
import { Context, Effect, Layer } from "effect";

import { type LogClickEvent } from "./schema";

export { ClickNotFoundError, RecordClickError };

export class ClickRecorder extends Context.Service<
  ClickRecorder,
  {
    readonly record: (
      event: LogClickEvent,
    ) => Effect.Effect<void, ClickNotFoundError | RecordClickError>;
  }
>()("ClickRecorder") {}

export const ClickRecorderLive = Layer.effect(
  ClickRecorder,
  AppDatabase.use((database) =>
    Effect.succeed({
      record: (event: LogClickEvent) => {
        logger.info(
          { short_code: event.short_code },
          "Log click event received",
        );
        return database.recordClick(event);
      },
    }),
  ),
);

export const recordClickOutcome = (event: LogClickEvent) =>
  ClickRecorder.use((recorder) => recorder.record(event)).pipe(
    Effect.as("recorded" as const),
    Effect.catchTag("ClickNotFoundError", () =>
      Effect.succeed("not_found" as const),
    ),
  );
