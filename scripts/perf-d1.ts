/**
 * Reproducible D1/SQLite measurements for the analytics and dashboard queries.
 *
 * Seeds an in-process SQLite database (same engine as local D1) with thousands
 * of links and hundreds of thousands of click events, prints EXPLAIN QUERY PLAN
 * for every statement the production helpers issue, and times those helpers.
 *
 *   bun scripts/perf-d1.ts
 *
 * The shape matches production: wub_link + wub_click_event, indexes from
 * migrations/d1, and the helpers in src/server/db used by tRPC.
 */
import { Database } from "bun:sqlite";

import { loadUserClickCounts } from "@/server/db/click-stats-sql";
import { clickAnalyticsFromD1 } from "@/server/db/d1-analytics";
import { type ClickStatementDatabase } from "@/server/db/record-click-sql";
import { applyD1Schema } from "@/server/db/schema-sql";
import {
  sparklineSince,
  userLinksWithSparklineCounts,
} from "@/server/db/sparklines";

const LINKS = 5_000;
const CLICKS = 200_000;
const USERS = 200;
const HOT_LINK_CLICKS = 80_000;
const HEAVY_USER = "user-heavy";
const HEAVY_LINKS = 40;
const NOW = new Date("2026-10-18T12:00:00.000Z");
const DAY_MS = 86_400_000;
const RANGE_90_MS = 90 * DAY_MS;

type Plan = { detail: string };

type Observed = {
  sql: string;
  params: unknown[];
};

function adapter(db: Database, observed: Observed[], rowsRead: { n: number }) {
  const prepared = new WeakMap<
    object,
    { sql: string; params: unknown[]; select: boolean }
  >();
  const database: ClickStatementDatabase = {
    prepare(query: string) {
      return {
        bind(...values: unknown[]) {
          observed.push({ sql: query, params: values });
          const statement = db.query(query);
          const select = /^\s*select/i.test(query);
          const bound = {
            async run() {
              if (select) {
                const results = statement.all(...(values as never[]));
                rowsRead.n += results.length;
                return { results, meta: {} };
              }
              const result = statement.run(...(values as never[]));
              return { meta: { changes: result.changes }, results: [] };
            },
            async first<T>() {
              return (
                (statement.get(...(values as never[])) as T | null) ?? null
              );
            },
            async all<T>() {
              const results = statement.all(...(values as never[])) as T[];
              rowsRead.n += results.length;
              return { results };
            },
          };
          prepared.set(bound, { sql: query, params: values, select });
          return bound;
        },
      };
    },
    async batch(statements) {
      const results = [];
      for (const statement of statements) {
        const meta = prepared.get(statement);
        if (!meta) {
          results.push(await statement.run());
          continue;
        }
        const compiled = db.query(meta.sql);
        if (meta.select) {
          const rows = compiled.all(...(meta.params as never[]));
          rowsRead.n += rows.length;
          results.push({ results: rows, meta: {} });
        } else {
          const result = compiled.run(...(meta.params as never[]));
          results.push({ meta: { changes: result.changes }, results: [] });
        }
      }
      return results;
    },
  };
  return database;
}

function explain(db: Database, sql: string, params: unknown[]): Plan[] {
  const rows = db
    .query(`EXPLAIN QUERY PLAN ${sql}`)
    .all(...(params as never[])) as Array<{ detail?: string; id?: number }>;
  return rows.map((row) => ({ detail: row.detail ?? JSON.stringify(row) }));
}

async function time<T>(label: string, runs: number, fn: () => Promise<T>) {
  await fn();
  const samples: number[] = [];
  let last: T | undefined;
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    last = await fn();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  const sum = samples.reduce((total, sample) => total + sample, 0);
  return {
    label,
    runs,
    meanMs: round(sum / samples.length),
    p50Ms: round(samples[Math.floor(samples.length / 2)] ?? 0),
    minMs: round(samples[0] ?? 0),
    result: last as T,
  };
}

function uniqueQueries(queries: Observed[]) {
  const seen = new Set<string>();
  return queries.filter((query) => {
    const key = query.sql.replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function pick<T>(items: readonly T[], index: number): T {
  return items[index % items.length] as T;
}

async function seed(db: Database) {
  await applyD1Schema(async (query) => {
    db.exec(query);
  });

  const insertUser = db.query(
    `INSERT INTO wub_user (id, email) VALUES (?1, ?2)`,
  );
  const insertLink = db.query(
    `INSERT INTO wub_link (short_code, url, "userId", created_at, click_count, expires_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
  );
  const insertClick = db.query(
    `INSERT INTO wub_click_event (
       event_id, short_code, recorded_at, country, city, device, browser, os, referrer
     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
  );

  const countries = ["US", "GB", "DE", "FR", "JP", "BR", "IN", "unknown", ""];
  const cities = [
    "Austin",
    "London",
    "Berlin",
    "Paris",
    "Tokyo",
    "unknown",
    "",
  ];
  const devices = ["desktop", "mobile", "tablet", "unknown"];
  const browsers = ["Chrome", "Safari", "Firefox", "unknown"];
  const systems = ["Windows", "macOS", "iOS", "Android", "unknown"];
  const referrers = ["direct", "google.com", "github.com", "t.co", ""];

  const userIds = Array.from({ length: USERS }, (_, index) =>
    index === 0 ? HEAVY_USER : `user-${index}`,
  );

  db.exec("BEGIN");
  for (const userId of userIds) {
    insertUser.run(userId, `${userId}@example.com`);
  }

  const codes: string[] = [];
  for (let index = 0; index < LINKS; index++) {
    const code = index === 0 ? "popular" : `l${index.toString(36)}`;
    const userId = index < HEAVY_LINKS ? HEAVY_USER : pick(userIds, index);
    const expiredGuest = index % 17 === 0;
    insertLink.run(
      code,
      `https://example.com/${code}`,
      expiredGuest ? null : userId,
      NOW.getTime() - 200 * DAY_MS,
      0,
      expiredGuest ? NOW.getTime() - DAY_MS : null,
    );
    codes.push(code);
  }

  let sequence = 0;
  const writeClick = (code: string, recordedAt: number, salt: number) => {
    insertClick.run(
      `evt-${sequence}`,
      code,
      recordedAt,
      pick(countries, salt),
      pick(cities, salt >> 1),
      pick(devices, salt >> 2),
      pick(browsers, salt >> 3),
      pick(systems, salt >> 4),
      pick(referrers, salt >> 5),
    );
    sequence += 1;
  };

  for (let index = 0; index < HOT_LINK_CLICKS; index++) {
    const age = (index / HOT_LINK_CLICKS) * 180 * DAY_MS;
    writeClick("popular", NOW.getTime() - Math.floor(age), index);
  }

  const heavyCodes = codes.slice(1, HEAVY_LINKS);
  const heavyClicks = 20_000;
  for (let index = 0; index < heavyClicks; index++) {
    const code = pick(heavyCodes, index);
    const age = (index / heavyClicks) * 14 * DAY_MS;
    writeClick(code, NOW.getTime() - Math.floor(age), index + 7);
  }

  const remaining = CLICKS - sequence;
  for (let index = 0; index < remaining; index++) {
    const code = pick(codes, index + 3);
    const age = (index / remaining) * 180 * DAY_MS;
    writeClick(code, NOW.getTime() - Math.floor(age), index + 11);
  }
  db.exec("COMMIT");

  const counts = db
    .query(
      `SELECT
         (SELECT COUNT(*) FROM wub_link) AS links,
         (SELECT COUNT(*) FROM wub_click_event) AS clicks,
         (SELECT COUNT(*) FROM wub_click_event WHERE short_code = 'popular' AND recorded_at >= ?1) AS popular90,
         (SELECT COUNT(*) FROM wub_click_event e
            INNER JOIN wub_link l ON l.short_code = e.short_code
            WHERE l."userId" = ?2 AND e.recorded_at >= ?3) AS heavy7`,
    )
    .get(
      NOW.getTime() - RANGE_90_MS,
      HEAVY_USER,
      sparklineSince(NOW).getTime(),
    ) as {
    links: number;
    clicks: number;
    popular90: number;
    heavy7: number;
  };
  return counts;
}

async function main() {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = OFF");
  const counts = await seed(db);
  const observed: Observed[] = [];
  const rowsRead = { n: 0 };
  const d1 = adapter(db, observed, rowsRead);

  rowsRead.n = 0;
  await clickAnalyticsFromD1(d1, "popular", "90d", NOW);
  const analyticsRows = rowsRead.n;
  const analyticsQueries = observed.splice(0, observed.length);
  const analytics = await time("clickAnalyticsFromD1 popular 90d", 5, () =>
    clickAnalyticsFromD1(d1, "popular", "90d", NOW),
  );
  observed.splice(0, observed.length);

  const since = sparklineSince(NOW);
  rowsRead.n = 0;
  const sparkProbe = await loadUserClickCounts(d1, HEAVY_USER, since);
  const sparkRows = rowsRead.n;
  const sparkQueries = observed.splice(0, observed.length);
  const sparks = await time(
    "dashboard sparkline heavy user 7d",
    5,
    async () => {
      const sparkCounts = await loadUserClickCounts(d1, HEAVY_USER, since);
      return {
        rows: sparkCounts.length,
        clicks: sparkCounts.reduce((sum, row) => sum + row.count, 0),
        links: userLinksWithSparklineCounts([], sparkCounts, NOW),
      };
    },
  );
  observed.splice(0, observed.length);

  rowsRead.n = 0;
  await clickAnalyticsFromD1(d1, "l10", "30d", NOW);
  const typicalRows = rowsRead.n;
  const typicalQueries = observed.splice(0, observed.length);
  const typical = await time("clickAnalyticsFromD1 typical 30d", 5, () =>
    clickAnalyticsFromD1(d1, "l10", "30d", NOW),
  );
  if (sparkProbe.length !== sparks.result.rows) {
    throw new Error("sparkline probe did not match the timed run");
  }

  const report = {
    seed: counts,
    analytics: {
      ...analytics,
      rowsRead: analyticsRows,
      statements: uniqueQueries(analyticsQueries).length,
      result: {
        total: analytics.result.total,
        previousTotal: analytics.result.previousTotal,
        buckets: analytics.result.buckets.length,
        countries: analytics.result.countries.length,
      },
    },
    sparks: {
      ...sparks,
      rowsRead: sparkRows,
      statements: uniqueQueries(sparkQueries).length,
      result: { rows: sparks.result.rows },
    },
    typical: {
      ...typical,
      rowsRead: typicalRows,
      statements: uniqueQueries(typicalQueries).length,
      result: { total: typical.result.total },
    },
    plans: {
      analytics: uniqueQueries(analyticsQueries).map((query) => ({
        sql: query.sql.replace(/\s+/g, " ").trim(),
        plan: explain(db, query.sql, query.params),
      })),
      sparks: uniqueQueries(sparkQueries).map((query) => ({
        sql: query.sql.replace(/\s+/g, " ").trim(),
        plan: explain(db, query.sql, query.params),
      })),
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

await main();
