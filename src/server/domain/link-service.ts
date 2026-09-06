import { generateDateArrayFromDays } from "@/lib/click-date-range";
import { clicks, links } from "@/server/db/schema";
import {
  generateShortCode,
  isUniqueViolation,
  MAX_SHORT_CODE_ATTEMPTS,
} from "@/server/domain/short-code";
import {
  DatabaseError,
  NotFound,
  RateLimited,
  ShortCodeCollision,
} from "@/server/errors";
import { Db } from "@/server/infra/db";
import { AppLogger } from "@/server/infra/logger";
import { RateLimiter } from "@/server/infra/rate-limiter";
import {
  type InferSelectModel,
  and,
  count,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  ne,
  sql,
} from "drizzle-orm";
import { Context, Effect, Layer } from "effect";

export type CreatedLink = InferSelectModel<typeof links>;

export class LinkService extends Context.Tag("LinkService")<
  LinkService,
  {
    readonly create: (input: {
      url: string;
      userId?: string;
      ip: string | null;
    }) => Effect.Effect<
      CreatedLink,
      RateLimited | DatabaseError | ShortCodeCollision
    >;
    readonly getTempLinks: (input: {
      codes: string[];
      ip: string | null;
    }) => Effect.Effect<CreatedLink[], RateLimited | DatabaseError>;
    readonly getUserLinks: (
      userId: string,
    ) => Effect.Effect<CreatedLink[], DatabaseError>;
    readonly deleteLink: (input: {
      shortCode: string;
      userId: string;
    }) => Effect.Effect<void, DatabaseError>;
    readonly getClicksFromLast30Days: (input: {
      shortCode: string;
      userId: string;
    }) => Effect.Effect<AnalyticsResult, NotFound | DatabaseError>;
  }
>() {}

export type AnalyticsResult = {
  link: {
    userId: string | null;
    url: string;
    short_code: string;
    created_at: Date;
  };
  clickRange: { date: string; clicks: number }[];
  countClicks: {
    countryClicks: Record<string, number>;
    cityClicks: Record<string, { clicks: number; country: string }>;
    deviceClicks: Record<string, number>;
    browserClicks: Record<string, number>;
    osClicks: Record<string, number>;
  };
  totalClicks: number;
};

export const LinkServiceLive = Layer.effect(
  LinkService,
  Effect.gen(function* () {
    const database = yield* Db;
    const limiter = yield* RateLimiter;
    const log = yield* AppLogger;

    const createShortLink = (
      url: string,
      userId?: string,
    ): Effect.Effect<CreatedLink, DatabaseError | ShortCodeCollision> =>
      Effect.gen(function* () {
        const shortLinkLogger = log.child({ url, userId });
        for (let attempt = 0; attempt < MAX_SHORT_CODE_ATTEMPTS; attempt++) {
          const short_code = generateShortCode();
          const inserted = yield* Effect.tryPromise({
            try: () =>
              database
                .insert(links)
                .values({
                  url,
                  short_code,
                  expires_at: userId
                    ? null
                    : new Date(Date.now() + 30 * 60 * 1000),
                  userId,
                })
                .returning(),
            catch: (cause) =>
              isUniqueViolation(cause)
                ? new ShortCodeCollision({ message: short_code })
                : new DatabaseError({ cause }),
          }).pipe(
            Effect.catchTag("ShortCodeCollision", (error) =>
              attempt < MAX_SHORT_CODE_ATTEMPTS - 1
                ? Effect.succeed(null as CreatedLink[] | null)
                : Effect.fail(error),
            ),
          );

          if (inserted && inserted[0]) {
            shortLinkLogger.info(
              { short_code },
              "Short link created in database",
            );
            return inserted[0];
          }
          shortLinkLogger.info(
            { short_code },
            "Short code collision, retrying",
          );
        }
        return yield* Effect.fail(
          new ShortCodeCollision({
            message: "Unable to allocate a unique short code",
          }),
        );
      });

    return {
      create: ({ url, userId, ip }) =>
        Effect.gen(function* () {
          yield* limiter.allow(ip);
          return yield* createShortLink(url, userId);
        }),
      getTempLinks: ({ codes, ip }) =>
        Effect.gen(function* () {
          yield* limiter.allow(ip);
          return yield* Effect.tryPromise({
            try: () =>
              database.query.links.findMany({
                where: and(
                  isNull(links.userId),
                  inArray(links.short_code, codes),
                  isNotNull(links.expires_at),
                ),
              }),
            catch: (cause) => new DatabaseError({ cause }),
          });
        }),
      getUserLinks: (userId) =>
        Effect.tryPromise({
          try: () =>
            database.query.links.findMany({
              orderBy: (userLinks, { desc }) => [desc(userLinks.created_at)],
              where: eq(links.userId, userId),
            }),
          catch: (cause) => new DatabaseError({ cause }),
        }),
      deleteLink: ({ shortCode, userId }) =>
        Effect.tryPromise({
          try: () =>
            database
              .delete(links)
              .where(
                and(eq(links.short_code, shortCode), eq(links.userId, userId)),
              )
              .then(() => undefined),
          catch: (cause) => new DatabaseError({ cause }),
        }),
      getClicksFromLast30Days: ({ shortCode, userId }) =>
        Effect.gen(function* () {
          const link = yield* Effect.tryPromise({
            try: () =>
              database.query.links.findFirst({
                where: eq(links.short_code, shortCode),
                columns: {
                  userId: true,
                  url: true,
                  short_code: true,
                  created_at: true,
                },
              }),
            catch: (cause) => new DatabaseError({ cause }),
          });
          if (link?.userId !== userId) {
            return yield* Effect.fail(
              new NotFound({ message: "Link not found" }),
            );
          }

          const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const inWindow = and(
            eq(clicks.short_code, shortCode),
            gte(clicks.timestamp, since),
          );

          const [
            totalRow,
            countryRows,
            cityRows,
            deviceRows,
            browserRows,
            osRows,
            dailyRows,
          ] = yield* Effect.tryPromise({
            try: () =>
              Promise.all([
                database
                  .select({ total: count() })
                  .from(clicks)
                  .where(inWindow)
                  .then((rows) => rows[0]),
                database
                  .select({ country: clicks.country, clicks: count() })
                  .from(clicks)
                  .where(
                    and(
                      inWindow,
                      isNotNull(clicks.country),
                      ne(clicks.country, "unknown"),
                    ),
                  )
                  .groupBy(clicks.country),
                database
                  .select({
                    city: clicks.city,
                    country: clicks.country,
                    clicks: count(),
                  })
                  .from(clicks)
                  .where(
                    and(
                      inWindow,
                      isNotNull(clicks.city),
                      ne(clicks.city, "unknown"),
                      isNotNull(clicks.country),
                    ),
                  )
                  .groupBy(clicks.city, clicks.country),
                database
                  .select({ device: clicks.device, clicks: count() })
                  .from(clicks)
                  .where(and(inWindow, isNotNull(clicks.device)))
                  .groupBy(clicks.device),
                database
                  .select({ browser: clicks.browser, clicks: count() })
                  .from(clicks)
                  .where(and(inWindow, isNotNull(clicks.browser)))
                  .groupBy(clicks.browser),
                database
                  .select({ os: clicks.os, clicks: count() })
                  .from(clicks)
                  .where(and(inWindow, isNotNull(clicks.os)))
                  .groupBy(clicks.os),
                database
                  .select({
                    day: sql<string>`to_char(${clicks.timestamp}, 'YYYY-MM-DD')`,
                    clicks: count(),
                  })
                  .from(clicks)
                  .where(inWindow)
                  .groupBy(sql`to_char(${clicks.timestamp}, 'YYYY-MM-DD')`),
              ]),
            catch: (cause) => new DatabaseError({ cause }),
          });

          const countryClicks: Record<string, number> = {};
          for (const row of countryRows) {
            if (row.country) countryClicks[row.country] = Number(row.clicks);
          }
          const cityClicks: Record<
            string,
            { clicks: number; country: string }
          > = {};
          for (const row of cityRows) {
            if (row.city && row.country) {
              cityClicks[row.city] = {
                clicks: Number(row.clicks),
                country: row.country,
              };
            }
          }
          const deviceClicks: Record<string, number> = {};
          for (const row of deviceRows) {
            if (row.device) deviceClicks[row.device] = Number(row.clicks);
          }
          const browserClicks: Record<string, number> = {};
          for (const row of browserRows) {
            if (row.browser) browserClicks[row.browser] = Number(row.clicks);
          }
          const osClicks: Record<string, number> = {};
          for (const row of osRows) {
            if (row.os) osClicks[row.os] = Number(row.clicks);
          }
          const clicksByDay: Record<string, number> = {};
          for (const row of dailyRows) {
            clicksByDay[row.day] = Number(row.clicks);
          }

          return {
            link,
            clickRange: generateDateArrayFromDays(30, clicksByDay),
            countClicks: {
              countryClicks,
              cityClicks,
              deviceClicks,
              browserClicks,
              osClicks,
            },
            totalClicks: Number(totalRow?.total ?? 0),
          };
        }),
    };
  }),
);
