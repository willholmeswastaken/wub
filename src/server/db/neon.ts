import { env } from "@/env";
import { type LogClickEvent } from "@/server/queue/schema";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { neon } from "@neondatabase/serverless";
import { and, eq, gte, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { Effect, Layer } from "effect";
import { type Adapter } from "next-auth/adapters";

import {
  AppDatabase,
  ClickNotFoundError,
  DatabaseError,
  RecordClickError,
} from "./database";
import { toClickSummary, toLinkRecord, toLinkSnapshot } from "./map";
import * as schema from "./schema";
import { clicks, createTable, links } from "./schema";
import { sparklineSince, userLinksWithSparklines } from "./sparklines";

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

export const NeonAppDatabaseLive = Layer.succeed(AppDatabase, {
  adapter: DrizzleAdapter(db, createTable) as Adapter,
  findLinkByCode: (code) =>
    attempt(async () => {
      const row = await db.query.links.findFirst({
        where: eq(links.short_code, code),
      });
      return row ? toLinkRecord(row) : null;
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
      const activity = await db
        .select({
          short_code: clicks.short_code,
          timestamp: clicks.timestamp,
        })
        .from(clicks)
        .innerJoin(links, eq(links.short_code, clicks.short_code))
        .where(
          and(
            eq(links.userId, userId),
            gte(clicks.timestamp, sparklineSince()),
          ),
        );
      return userLinksWithSparklines(rows, activity);
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
      await db
        .delete(links)
        .where(and(eq(links.short_code, code), eq(links.userId, userId)));
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
  listClicksSince: (code, since) =>
    attempt(async () => {
      const rows = await db.query.clicks.findMany({
        where: and(eq(clicks.short_code, code), gte(clicks.timestamp, since)),
        columns: {
          timestamp: true,
          country: true,
          device: true,
          city: true,
          browser: true,
          os: true,
          referrer: true,
        },
      });
      return rows.map(toClickSummary);
    }),
  countClicksBetween: (code, from, until) =>
    attempt(async () => {
      const rows = await db
        .select({ count: sql<number>`count(*)` })
        .from(clicks)
        .where(
          and(
            eq(clicks.short_code, code),
            gte(clicks.timestamp, from),
            lt(clicks.timestamp, until),
          ),
        );
      return Number(rows[0]?.count ?? 0);
    }),
  insertLink: (link) =>
    attempt(async () => {
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
  recordClick: (event: LogClickEvent) =>
    Effect.gen(function* () {
      const updated = yield* Effect.tryPromise({
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
      if (updated.length === 0) {
        return yield* new ClickNotFoundError({ shortCode: event.short_code });
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
            referrer: event.referrer ?? null,
          }),
        catch: (cause) => new RecordClickError({ cause }),
      });
    }),
});
