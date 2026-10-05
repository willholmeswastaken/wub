import { type ClickRange } from "@/lib/click-date-range";
import logger from "@/server/logger";
import { type LogClickEvent } from "@/server/queue/schema";
import { env as workersEnv } from "cloudflare:workers";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Effect, Layer } from "effect";
import { type Adapter } from "next-auth/adapters";

import { forgetRedirectTarget, rememberRedirectTarget } from "../kv-links";
import { loadUserClickStamps } from "./click-stats-sql";
import { isUniqueViolation, LinkConflictError } from "./conflicts";
import { clickAnalyticsFromD1 } from "./d1-analytics";
import {
  AppDatabase,
  ClickNotFoundError,
  DatabaseError,
  RecordClickError,
} from "./database";
import { toLinkRecord, toLinkSnapshot } from "./map";
import {
  deleteExpiredGuestLinksOnD1,
  recordClickOnD1,
  type ClickStatementDatabase,
} from "./record-click-sql";
import * as schema from "./schema.d1";
import { links } from "./schema.d1";
import { sparklineSince, userLinksWithSparklines } from "./sparklines";
import { createCloudflareAuthAdapter } from "./sqlite-auth";

type D1Binding = Parameters<typeof drizzle>[0] &
  ClickStatementDatabase & {
    withSession?(constraint: string): D1Binding;
    batch(statements: unknown[]): Promise<unknown[]>;
  };

function getD1Binding(): D1Binding {
  const database = (workersEnv as { DB?: D1Binding }).DB;
  if (!database) {
    throw new Error("DB binding is missing");
  }
  return database;
}

function getD1Database(mode: "read" | "write" = "read") {
  const binding = getD1Binding();
  const client =
    mode === "read" && typeof binding.withSession === "function"
      ? binding.withSession("first-unconstrained")
      : binding;
  return drizzle(client as Parameters<typeof drizzle>[0], { schema });
}

let authAdapter: Adapter | undefined;

function getAuthAdapter(): Adapter {
  authAdapter ??= createCloudflareAuthAdapter(getD1Database("write"));
  return authAdapter;
}

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

function redirectTargetOf(row: {
  url: string;
  expires_at: Date | number | null;
}) {
  return {
    url: row.url,
    expiresAt:
      row.expires_at == null
        ? null
        : row.expires_at instanceof Date
          ? row.expires_at
          : new Date(row.expires_at),
  };
}

export const CloudflareAppDatabaseLive = Layer.succeed(AppDatabase, {
  get adapter() {
    return getAuthAdapter();
  },
  findLinkByCode: (code) =>
    attempt(async () => {
      const row = await getD1Database("write").query.links.findFirst({
        where: eq(links.short_code, code),
      });
      return row ? toLinkRecord(row) : null;
    }),
  findRedirectTarget: (code) =>
    attempt(async () => {
      // Primary, not a replica: a replica miss must not negative-cache a new link.
      const row = await getD1Database("write").query.links.findFirst({
        where: eq(links.short_code, code),
        columns: { url: true, expires_at: true },
      });
      return row ? redirectTargetOf(row) : null;
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
      const rows = await getD1Database().query.links.findMany({
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
      let stamps: Awaited<ReturnType<typeof loadUserClickStamps>> = [];
      try {
        stamps = await loadUserClickStamps(
          getD1Binding(),
          userId,
          sparklineSince(),
        );
      } catch (cause) {
        logger.info(
          { message: cause instanceof Error ? cause.message : "sparkline" },
          "Click sparkline query failed",
        );
      }
      return userLinksWithSparklines(rows, stamps);
    }),
  updateLinkUrl: (code, userId, url) =>
    attempt(async () => {
      const rows = await getD1Database("write")
        .update(links)
        .set({ url })
        .where(and(eq(links.short_code, code), eq(links.userId, userId)))
        .returning({
          short_code: links.short_code,
          url: links.url,
          expires_at: links.expires_at,
        })
        .all();
      const row = rows[0];
      if (!row) return null;
      await rememberRedirectTarget({
        code: row.short_code,
        ...redirectTargetOf(row),
      });
      return { short_code: row.short_code, url: row.url };
    }),
  deleteUserLink: (code, userId) =>
    attempt(async () => {
      const database = getD1Binding();
      const deleted = await database
        .prepare(
          `DELETE FROM wub_link WHERE short_code = ?1 AND "userId" = ?2 RETURNING short_code`,
        )
        .bind(code, userId)
        .all<{ short_code: string }>();
      if ((deleted.results?.length ?? 0) === 0) return;
      await database.batch([
        database
          .prepare(`DELETE FROM wub_click_event WHERE short_code = ?1`)
          .bind(code),
        database
          .prepare(`DELETE FROM wub_click WHERE short_code = ?1`)
          .bind(code),
      ]);
      await forgetRedirectTarget(code);
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
  clickAnalytics: (code, range: ClickRange, now?: Date) =>
    attempt(() => clickAnalyticsFromD1(getD1Binding(), code, range, now)),
  insertLink: (link) =>
    attemptInsert(async () => {
      try {
        const row = await getD1Database("write")
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
        const record = toLinkRecord(row);
        await rememberRedirectTarget({
          code: record.short_code,
          url: record.url,
          expiresAt: record.expires_at,
        });
        return record;
      } catch (cause) {
        if (cause instanceof LinkConflictError) throw cause;
        if (isUniqueViolation(cause)) throw new LinkConflictError();
        throw cause;
      }
    }),
  claimGuestLinks: (userId, claims) =>
    attempt(async () => {
      const claimed: string[] = [];
      for (const { shortCode, claimToken } of claims) {
        const rows = await getD1Database("write")
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
          .returning({ short_code: links.short_code, url: links.url })
          .all();
        for (const row of rows) {
          claimed.push(row.short_code);
          await rememberRedirectTarget({
            code: row.short_code,
            url: row.url,
            expiresAt: null,
          });
        }
      }
      return claimed;
    }),
  deleteExpiredGuestLinks: () =>
    attempt(async () => {
      const codes = await deleteExpiredGuestLinksOnD1(getD1Binding());
      await Promise.all(codes.map((code) => forgetRedirectTarget(code)));
      return codes;
    }),
  recordClick: (event: LogClickEvent) =>
    Effect.gen(function* () {
      const outcome = yield* Effect.tryPromise({
        try: () => recordClickOnD1(getD1Binding(), event),
        catch: (cause) => new RecordClickError({ cause }),
      });
      if (outcome === "not_found") {
        return yield* new ClickNotFoundError({ shortCode: event.short_code });
      }
    }),
});
