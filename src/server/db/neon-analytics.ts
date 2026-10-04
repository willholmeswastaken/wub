import {
  type ClickRange,
  previousRangeStart,
  rangeStart,
} from "@/lib/click-date-range";
import { type SQL, and, eq, gte, lt, sql } from "drizzle-orm";
import { type NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "./schema";
import { type ClickAnalytics, type CountItem } from "./types";

const { clicks } = schema;

const BREAKDOWN_LIMIT = 50;

type Database = NeonHttpDatabase<typeof schema>;

function periodWhere(code: string, from: Date, until: Date) {
  return and(
    eq(clicks.short_code, code),
    gte(clicks.timestamp, from),
    lt(clicks.timestamp, until),
  );
}

async function countsFor(
  db: Database,
  code: string,
  from: Date,
  until: Date,
  key: SQL,
  extra?: SQL,
): Promise<CountItem[] | Array<CountItem & { country: string }>> {
  const rows = await db
    .select({
      key: sql<string>`${key}`,
      country: extra ? sql<string>`${extra}` : sql<string>`''`,
      count: sql<number>`count(*)::int`,
    })
    .from(clicks)
    .where(
      and(
        periodWhere(code, from, until),
        sql`${key} IS NOT NULL`,
        sql`${key} <> 'unknown'`,
        sql`${key} <> ''`,
      ),
    )
    .groupBy(extra ? sql`${key}, ${extra}` : key)
    .orderBy(sql`count(*) DESC`)
    .limit(BREAKDOWN_LIMIT);
  return rows.map((row) => ({
    key: row.key,
    count: Number(row.count) || 0,
    ...(extra ? { country: row.country } : {}),
  }));
}

export async function neonClickAnalytics(
  db: Database,
  code: string,
  range: ClickRange,
  now = new Date(),
): Promise<ClickAnalytics> {
  const start = rangeStart(range, now);
  const bucket =
    range === "24h"
      ? sql`date_trunc('hour', ${clicks.timestamp})`
      : sql`date_trunc('day', ${clicks.timestamp})`;
  const [
    bucketRows,
    previousRows,
    countries,
    cities,
    devices,
    browsers,
    os,
    referrers,
  ] = await Promise.all([
    db
      .select({
        at: sql<string>`${bucket}`,
        count: sql<number>`count(*)::int`,
      })
      .from(clicks)
      .where(periodWhere(code, start, now))
      .groupBy(bucket),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(clicks)
      .where(periodWhere(code, previousRangeStart(range, now), start)),
    countsFor(db, code, start, now, sql`${clicks.country}`),
    countsFor(
      db,
      code,
      start,
      now,
      sql`${clicks.city}`,
      sql`${clicks.country}`,
    ),
    countsFor(db, code, start, now, sql`${clicks.device}`),
    countsFor(db, code, start, now, sql`${clicks.browser}`),
    countsFor(db, code, start, now, sql`${clicks.os}`),
    countsFor(
      db,
      code,
      start,
      now,
      sql`coalesce(${clicks.referrer}, 'direct')`,
    ),
  ]);

  const buckets = bucketRows.map((row) => ({
    at: new Date(row.at),
    count: Number(row.count) || 0,
  }));
  return {
    buckets,
    total: buckets.reduce((sum, entry) => sum + entry.count, 0),
    previousTotal: Number(previousRows[0]?.count ?? 0),
    countries: countries as CountItem[],
    cities: cities as Array<CountItem & { country: string }>,
    devices: devices as CountItem[],
    browsers: browsers as CountItem[],
    os: os as CountItem[],
    referrers: referrers as CountItem[],
  };
}
