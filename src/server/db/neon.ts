import { env } from "@/env";
import { type ClickRange } from "@/lib/click-date-range";
import { type LogClickEvent } from "@/server/queue/schema";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { neon } from "@neondatabase/serverless";
import { and, eq, gte, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { Effect, Layer } from "effect";
import { type Adapter } from "next-auth/adapters";

import { isUniqueViolation, LinkConflictError } from "./conflicts";
import {
  AppDatabase,
  ClickNotFoundError,
  DatabaseError,
  RecordClickError,
} from "./database";
import { toLinkRecord, toLinkSnapshot } from "./map";
import { neonClickAnalytics } from "./neon-analytics";
import * as schema from "./schema";
import { clicks, createTable, links } from "./schema";
import { sparklineSince, userLinksWithSparklineCounts } from "./sparklines";

function getNeonDatabase() {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required when DATABASE_PROVIDER=neon");
  }
  return drizzle(neon(databaseUrl), { schema });
}

const db = getNeonDatabase();

function attempt<A>(run: () => Promise<A>) {
  return Effect.tryPromise({
    try: run,
    catch: (cause) => new DatabaseError({ cause }),
  });
}

function attemptInsert<A>(run: () => Promise<A>) {
  return Effect.tryPromise({
    try: run,
    catch: (cause) =>
      cause instanceof LinkConflictError ? cause : new DatabaseError({ cause }),
  });
}

function rowsOf(result: unknown) {
  if (Array.isArray(result)) return result;
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows: unknown }).rows;
    return Array.isArray(rows) ? rows : [];
  }
  return [];
}

export const NeonAppDatabaseLive = Layer.succeed(AppDatabase, {
  adapter: DrizzleAdapter(db, createTable) as Adapter,
  findLinkByCode: (code) =>
    attempt(async () => {
      const row = await db.query.links.findFirst({
        where: eq(links.short_code, code),
      });
      return row ? toLinkRecord(row) : null;
    }),
  findRedirectTarget: (code) =>
    attempt(async () => {
      const row = await db.query.links.findFirst({
        where: eq(links.short_code, code),
        columns: { url: true, expires_at: true },
      });
      return row ? { url: row.url, expiresAt: row.expires_at } : null;
    }),
  listTempLinks: (codes) =>
    attempt(async () => {
      if (codes.length === 0) return [];
      const rows = await db.query.links.findMany({
        where: and(
          isNull(links.userId),
          and(inArray(links.short_code, codes), isNotNull(links.expires_at)),
        ),
      });
      return rows.map(toLinkRecord);
    }),
  listUserLinks: (userId) =>
    attempt(async () => {
      const rows = await db.query.links.findMany({
        orderBy: (link, { desc }) => [desc(link.created_at)],
        where: eq(links.userId, userId),
        columns: {
          short_code: true,
          url: true,
          created_at: true,
          click_count: true,
          last_clicked: true,
        },
      });
      if (rows.length === 0) return [];
      const since = sparklineSince();
      const activity = await db
        .select({
          short_code: clicks.short_code,
          day: sql<string>`to_char(date_trunc('day', ${clicks.timestamp} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        })
        .from(clicks)
        .innerJoin(links, eq(links.short_code, clicks.short_code))
        .where(and(eq(links.userId, userId), gte(clicks.timestamp, since)))
        .groupBy(
          clicks.short_code,
          sql`date_trunc('day', ${clicks.timestamp} AT TIME ZONE 'UTC')`,
        );
      return userLinksWithSparklineCounts(
        rows,
        activity.map((row) => ({
          short_code: row.short_code,
          day: row.day,
          count: Number(row.count) || 0,
        })),
      );
    }),
  updateLinkUrl: (code, userId, url) =>
    attempt(async () => {
      const rows = await db
        .update(links)
        .set({ url })
        .where(and(eq(links.short_code, code), eq(links.userId, userId)))
        .returning({ short_code: links.short_code, url: links.url });
      return rows[0] ?? null;
    }),
  deleteUserLink: (code, userId) =>
    attempt(async () => {
      const deleted = await db
        .delete(links)
        .where(and(eq(links.short_code, code), eq(links.userId, userId)))
        .returning({ short_code: links.short_code });
      if (deleted.length === 0) return;
      await db.delete(clicks).where(eq(clicks.short_code, code));
    }),
  findLinkSnapshot: (code) =>
    attempt(async () => {
      const row = await db.query.links.findFirst({
        where: eq(links.short_code, code),
        columns: {
          userId: true,
          url: true,
          short_code: true,
          created_at: true,
        },
      });
      return row ? toLinkSnapshot(row) : null;
    }),
  clickAnalytics: (code, range: ClickRange, now?: Date) =>
    attempt(() => neonClickAnalytics(db, code, range, now)),
  insertLink: (link) =>
    attemptInsert(async () => {
      try {
        const rows = await db
          .insert(links)
          .values({
            url: link.url,
            short_code: link.short_code,
            expires_at: link.expires_at,
            userId: link.userId,
            claim_token: link.claim_token,
          })
          .returning();
        const row = rows[0];
        if (!row) {
          throw new Error("Insert did not return a link");
        }
        return toLinkRecord(row);
      } catch (cause) {
        if (isUniqueViolation(cause)) throw new LinkConflictError();
        throw cause;
      }
    }),
  claimGuestLinks: (userId, claims) =>
    attempt(async () => {
      const claimed: string[] = [];
      for (const { shortCode, claimToken } of claims) {
        const rows = await db
          .update(links)
          .set({
            userId,
            expires_at: null,
            claim_token: null,
          })
          .where(
            and(
              eq(links.short_code, shortCode),
              eq(links.claim_token, claimToken),
              isNull(links.userId),
            ),
          )
          .returning({ short_code: links.short_code });
        claimed.push(...rows.map((row) => row.short_code));
      }
      return claimed;
    }),
  deleteExpiredGuestLinks: () =>
    attempt(async () => {
      const deleted = await db
        .delete(links)
        .where(
          and(
            isNull(links.userId),
            isNotNull(links.expires_at),
            lt(links.expires_at, new Date()),
          ),
        )
        .returning({ short_code: links.short_code });
      const codes = deleted.map((row) => row.short_code);
      if (codes.length > 0) {
        await db.delete(clicks).where(inArray(clicks.short_code, codes));
      }
      return codes;
    }),
  recordClick: (event: LogClickEvent) =>
    Effect.gen(function* () {
      const updated = yield* Effect.tryPromise({
        try: () =>
          db.execute(sql`
            WITH inserted AS (
              INSERT INTO wub_click (
                event_id, short_code, "userAgent", country, city, region,
                latitude, longitude, device, device_vendor, device_model,
                browser, browser_version, engine, engine_version, os,
                os_version, cpu_architecture, referrer
              )
              SELECT
                ${event.event_id}, ${event.short_code}, ${event.userAgent},
                ${event.country}, ${event.city}, ${event.region},
                ${event.latitude}, ${event.longitude}, ${event.device},
                ${event.device_vendor}, ${event.device_model}, ${event.browser},
                ${event.browser_version}, ${event.engine}, ${event.engine_version},
                ${event.os}, ${event.os_version}, ${event.cpu_architecture},
                ${event.referrer ?? null}
              WHERE EXISTS (
                SELECT 1 FROM wub_link WHERE short_code = ${event.short_code}
              )
              ON CONFLICT (event_id) DO NOTHING
              RETURNING event_id
            )
            UPDATE wub_link
            SET click_count = click_count + 1,
                last_clicked = CURRENT_TIMESTAMP
            WHERE short_code = ${event.short_code}
              AND EXISTS (SELECT 1 FROM inserted)
            RETURNING click_count
          `),
        catch: (cause) => new RecordClickError({ cause }),
      });
      if (rowsOf(updated).length > 0) return;
      const link = yield* Effect.tryPromise({
        try: () =>
          db.query.links.findFirst({
            where: eq(links.short_code, event.short_code),
            columns: { short_code: true },
          }),
        catch: (cause) => new RecordClickError({ cause }),
      });
      if (!link) {
        return yield* new ClickNotFoundError({ shortCode: event.short_code });
      }
    }),
});
