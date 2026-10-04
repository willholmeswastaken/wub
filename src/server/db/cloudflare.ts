import { type LogClickEvent } from "@/server/queue/schema";
import { env as workersEnv } from "cloudflare:workers";
import { and, eq, gte, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Effect, Layer } from "effect";
import { type Adapter } from "next-auth/adapters";

import {
  AppDatabase,
  ClickNotFoundError,
  DatabaseError,
  RecordClickError,
} from "./database";
import { toClickSummary, toLinkRecord, toLinkSnapshot } from "./map";
import { sparklineSince, userLinksWithSparklines } from "./sparklines";
import { D1_ADDED_COLUMNS, D1_BOOTSTRAP_STATEMENTS } from "./schema-sql";
import * as schema from "./schema.d1";
import { clicks, links } from "./schema.d1";
import { createCloudflareAuthAdapter } from "./sqlite-auth";

type D1Binding = Parameters<typeof drizzle>[0] & {
  exec(query: string): Promise<unknown>;
};

function getD1Binding(): D1Binding {
  const database = (workersEnv as { DB?: D1Binding }).DB;
  if (!database) {
    throw new Error("DB binding is missing");
  }
  return database;
}

let schemaReady: Promise<void> | undefined;

function ensureSchema() {
  schemaReady ??= (async () => {
    try {
      const binding = getD1Binding();
      for (const statement of D1_BOOTSTRAP_STATEMENTS) {
        await binding.exec(statement);
      }
      for (const statement of D1_ADDED_COLUMNS) {
        try {
          await binding.exec(statement);
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause);
          if (!/duplicate column/i.test(message)) throw cause;
        }
      }
    } catch (cause) {
      schemaReady = undefined;
      throw cause;
    }
  })();
  return schemaReady;
}

function getD1Database() {
  return drizzle(getD1Binding(), { schema });
}

let authAdapter: Adapter | undefined;

function getAuthAdapter(): Adapter {
  authAdapter ??= wrapAdapter(createCloudflareAuthAdapter(getD1Database()));
  return authAdapter;
}

function wrapAdapter(adapter: Adapter): Adapter {
  return new Proxy(adapter, {
    get(target, prop, receiver) {
      const value: unknown = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) =>
        ensureSchema().then(() =>
          (value as (...params: unknown[]) => unknown).apply(target, args),
        );
    },
  });
}

function attempt<A>(run: () => Promise<A>) {
  return Effect.tryPromise({
    try: async () => {
      await ensureSchema();
      return run();
    },
    catch: (cause) => new DatabaseError({ cause }),
  });
}

export const CloudflareAppDatabaseLive = Layer.succeed(AppDatabase, {
  get adapter() {
    return getAuthAdapter();
  },
  findLinkByCode: (code) =>
    attempt(async () => {
      const row = await getD1Database().query.links.findFirst({
        where: eq(links.short_code, code),
      });
      return row ? toLinkRecord(row) : null;
    }),
  listTempLinks: (codes) =>
    attempt(async () => {
      if (codes.length === 0) return [];
      const rows = await getD1Database().query.links.findMany({
        where: and(
          isNull(links.userId),
          and(inArray(links.short_code, codes), isNotNull(links.expires_at)),
        ),
      });
      return rows.map(toLinkRecord);
    }),
  listUserLinks: (userId) =>
    attempt(async () => {
      const database = getD1Database();
      const rows = await database.query.links.findMany({
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
      const activity = await database
        .select({
          short_code: clicks.short_code,
          timestamp: clicks.timestamp,
        })
        .from(clicks)
        .innerJoin(links, eq(links.short_code, clicks.short_code))
        .where(
          and(eq(links.userId, userId), gte(clicks.timestamp, sparklineSince())),
        )
        .all();
      return userLinksWithSparklines(rows, activity);
    }),
  updateLinkUrl: (code, userId, url) =>
    attempt(async () => {
      const rows = await getD1Database()
        .update(links)
        .set({ url })
        .where(and(eq(links.short_code, code), eq(links.userId, userId)))
        .returning({ short_code: links.short_code, url: links.url })
        .all();
      return rows[0] ?? null;
    }),
  deleteUserLink: (code, userId) =>
    attempt(async () => {
      await getD1Database()
        .delete(links)
        .where(and(eq(links.short_code, code), eq(links.userId, userId)))
        .run();
    }),
  findLinkSnapshot: (code) =>
    attempt(async () => {
      const row = await getD1Database().query.links.findFirst({
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
      const rows = await getD1Database().query.clicks.findMany({
        where: and(eq(clicks.short_code, code), gte(clicks.timestamp, since)),
        columns: {
          timestamp: true,
          country: true,
          device: true,
          city: true,
          browser: true,
          os: true,
        },
      });
      return rows.map(toClickSummary);
    }),
  insertLink: (link) =>
    attempt(async () => {
      const row = await getD1Database()
        .insert(links)
        .values({
          url: link.url,
          short_code: link.short_code,
          expires_at: link.expires_at,
          userId: link.userId,
          claim_token: link.claim_token,
        })
        .returning()
        .get();
      if (!row) {
        throw new Error("Insert did not return a link");
      }
      return toLinkRecord(row);
    }),
  claimGuestLinks: (userId, claims) =>
    attempt(async () => {
      const claimed: string[] = [];
      for (const { shortCode, claimToken } of claims) {
        const rows = await getD1Database()
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
          .returning({ short_code: links.short_code })
          .all();
        claimed.push(...rows.map((row) => row.short_code));
      }
      return claimed;
    }),
  recordClick: (event: LogClickEvent) =>
    Effect.gen(function* () {
      yield* Effect.tryPromise({
        try: () => ensureSchema(),
        catch: (cause) => new RecordClickError({ cause }),
      });
      const database = getD1Database();
      const updated = yield* Effect.tryPromise({
        try: () =>
          database
            .update(links)
            .set({
              click_count: sql`${links.click_count} + 1`,
              last_clicked: new Date(),
            })
            .where(eq(links.short_code, event.short_code))
            .returning({ click_count: links.click_count })
            .all(),
        catch: (cause) => new RecordClickError({ cause }),
      });
      if (updated.length === 0) {
        return yield* new ClickNotFoundError({ shortCode: event.short_code });
      }
      yield* Effect.tryPromise({
        try: () =>
          database
            .insert(clicks)
            .values({
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
            })
            .run(),
        catch: (cause) => new RecordClickError({ cause }),
      });
    }),
});
