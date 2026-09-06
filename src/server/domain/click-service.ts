import { clicks, links } from "@/server/db/schema";
import { DatabaseError, ExpiredLink, NotFound } from "@/server/errors";
import { ClickQueue } from "@/server/infra/click-queue";
import { Db } from "@/server/infra/db";
import { AppLogger } from "@/server/infra/logger";
import { type LogClickEvent } from "@/server/qstash";
import { eq, sql } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";

export type ResolvedLink = {
  url: string;
  short_code: string;
};

export class ClickService extends Context.Tag("ClickService")<
  ClickService,
  {
    readonly resolveAndEnqueue: (input: {
      shortCode: string;
      event?: LogClickEvent;
    }) => Effect.Effect<ResolvedLink, NotFound | ExpiredLink | DatabaseError>;
    readonly persistClick: (input: {
      event: LogClickEvent;
      messageId: string;
    }) => Effect.Effect<
      { duplicate: boolean; clickCount?: number },
      NotFound | DatabaseError
    >;
  }
>() {}

export const ClickServiceLive = Layer.effect(
  ClickService,
  Effect.gen(function* () {
    const database = yield* Db;
    const queue = yield* ClickQueue;
    const log = yield* AppLogger;

    return {
      resolveAndEnqueue: ({ shortCode, event }) =>
        Effect.gen(function* () {
          const functionLogger = log.child({ short_code: shortCode });
          functionLogger.info("Incoming short link request");

          const route = yield* Effect.tryPromise({
            try: () =>
              database.query.links.findFirst({
                where: eq(links.short_code, shortCode),
              }),
            catch: (cause) => new DatabaseError({ cause }),
          });

          if (!route) {
            functionLogger.info("Short link not found");
            return yield* Effect.fail(
              new NotFound({ message: "Short link not found" }),
            );
          }
          if (route.expires_at && new Date() > route.expires_at) {
            functionLogger.info("Short link expired");
            return yield* Effect.fail(
              new ExpiredLink({ message: "Short link expired" }),
            );
          }

          if (event) {
            yield* queue.publish(event);
            functionLogger.info("Log click event sent");
          }

          functionLogger.info(
            { redirect_to: route.url },
            "Short link found redirecting to ",
          );
          return { url: route.url, short_code: route.short_code };
        }),
      persistClick: ({ event, messageId }) =>
        Effect.gen(function* () {
          const functionLogger = log.child({
            short_code: event.short_code,
            message_id: messageId,
          });
          functionLogger.info("Log click event received");

          const inserted = yield* Effect.tryPromise({
            try: () =>
              database
                .insert(clicks)
                .values({
                  short_code: event.short_code,
                  message_id: messageId,
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
                })
                .onConflictDoNothing({ target: clicks.message_id })
                .returning({ id: clicks.id }),
            catch: (cause) => new DatabaseError({ cause }),
          });

          if (inserted.length === 0) {
            functionLogger.info("Duplicate click event ignored");
            return { duplicate: true };
          }

          const res = yield* Effect.tryPromise({
            try: () =>
              database
                .update(links)
                .set({
                  click_count: sql`${links.click_count} + 1`,
                  last_clicked: new Date(),
                })
                .where(eq(links.short_code, event.short_code))
                .returning({ click_count: links.click_count }),
            catch: (cause) => new DatabaseError({ cause }),
          });

          if (res.length === 0) {
            return yield* Effect.fail(
              new NotFound({ message: "Short link not found" }),
            );
          }

          functionLogger.info({ new_click_count: res }, "Click recorded");
          return { duplicate: false, clickCount: res[0]?.click_count };
        }),
    };
  }),
);
