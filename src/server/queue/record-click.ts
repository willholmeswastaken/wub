import { db } from "@/server/db";
import { clicks, links } from "@/server/db/schema";
import logger from "@/server/logger";
import { eq, sql } from "drizzle-orm";
import { Context, Data, Effect, Layer } from "effect";

import { type LogClickEvent } from "./schema";

export class ClickNotFoundError extends Data.TaggedError("ClickNotFoundError")<{
  readonly shortCode: string;
}> {}

export class RecordClickError extends Data.TaggedError("RecordClickError")<{
  readonly cause: unknown;
}> {}

export class ClickRecorder extends Context.Service<
  ClickRecorder,
  {
    readonly record: (
      event: LogClickEvent,
    ) => Effect.Effect<void, ClickNotFoundError | RecordClickError>;
  }
>()("ClickRecorder") {}

export const ClickRecorderLive = Layer.succeed(ClickRecorder, {
  record: (event) =>
    Effect.gen(function* () {
      const functionLogger = logger.child({ short_code: event.short_code });
      functionLogger.info("Log click event received");

      const res = yield* Effect.tryPromise({
        try: () =>
          db
            .update(links)
            .set({
              click_count: sql`${links.click_count} + 1`,
              last_clicked: new Date(),
            })
            .where(eq(links.short_code, event.short_code))
            .returning({ click_count: links.click_count }),
        catch: (cause) => new RecordClickError({ cause }),
      });

      if (res.length === 0) {
        logger.info("Short link not found, cant update click count");
        return yield* new ClickNotFoundError({
          shortCode: event.short_code,
        });
      }

      yield* Effect.tryPromise({
        try: () =>
          db.insert(clicks).values({
            short_code: event.short_code,
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            country: event.country,
            city: event.city,
            region: event.region,
            latitude: event.latitude,
            longitude: event.longitude,
            device: event.device,
            device_vendor: event.device_vendor,
            device_model: event.device_model,
            browser: event.browser,
            browser_version: event.browser_version,
            engine: event.engine,
            engine_version: event.engine_version,
            os: event.os,
            os_version: event.os_version,
            cpu_architecture: event.cpu_architecture,
          }),
        catch: (cause) => new RecordClickError({ cause }),
      });

      functionLogger.info({ new_click_count: res }, "Click recorded");
    }),
});

export const recordClickOutcome = (event: LogClickEvent) =>
  ClickRecorder.use((recorder) => recorder.record(event)).pipe(
    Effect.as("recorded" as const),
    Effect.catchTag("ClickNotFoundError", () =>
      Effect.succeed("not_found" as const),
    ),
  );
