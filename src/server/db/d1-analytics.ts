import {
  type ClickRange,
  previousRangeStart,
  rangeStart,
} from "@/lib/click-date-range";
import { type ClickAnalytics, type CountItem } from "@/server/db/types";

import { type ClickStatementDatabase } from "./record-click-sql";

const BREAKDOWN_LIMIT = 50;

type CountRow = { key: string | null; n: number | string | null };
type CityRow = {
  key: string | null;
  country: string | null;
  n: number | string | null;
};
type BucketRow = { bucket: number | string | null; n: number | string | null };
type TotalRow = {
  total: number | string | null;
  previous_total: number | string | null;
};

type StatementResult = {
  results?: unknown[];
};

function asNumber(value: number | string | null | undefined) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function rowsOf<T>(result: StatementResult | undefined): T[] {
  return (result?.results ?? []) as T[];
}

function ranked(rows: CountRow[]): CountItem[] {
  return rows
    .filter((row): row is CountRow & { key: string } => !!row.key)
    .map((row) => ({ key: row.key, count: asNumber(row.n) }));
}

function dimensionSql(column: string, skipUnknown: boolean) {
  const unknown = skipUnknown ? ` AND ${column} <> 'unknown'` : "";
  return `
SELECT ${column} AS key, COUNT(*) AS n
FROM wub_click_event
WHERE short_code = ?1
  AND recorded_at >= ?2
  AND recorded_at < ?3
  AND ${column} IS NOT NULL
  AND ${column} <> ''${unknown}
GROUP BY ${column}
ORDER BY n DESC, key ASC
LIMIT ${BREAKDOWN_LIMIT}`;
}

export async function clickAnalyticsFromD1(
  database: ClickStatementDatabase,
  code: string,
  range: ClickRange,
  now = new Date(),
): Promise<ClickAnalytics> {
  const until = now.getTime();
  const start = rangeStart(range, now).getTime();
  const previous = previousRangeStart(range, now).getTime();
  // Integer literals, not bound numbers: D1 binds JS numbers as REAL, and
  // real division would keep the original timestamp instead of the UTC bucket.
  const bucketExpr =
    range === "24h"
      ? "(recorded_at / 3600000) * 3600000"
      : "(recorded_at / 86400000) * 86400000";
  const current = [code, start, until] as const;

  const [totals, buckets, countries, cities, devices, browsers, os, referrers] =
    (await database.batch([
      database
        .prepare(
          `SELECT
             SUM(CASE WHEN recorded_at >= ?2 AND recorded_at < ?3 THEN 1 ELSE 0 END) AS total,
             SUM(CASE WHEN recorded_at >= ?4 AND recorded_at < ?2 THEN 1 ELSE 0 END) AS previous_total
           FROM wub_click_event
           WHERE short_code = ?1 AND recorded_at >= ?4 AND recorded_at < ?3`,
        )
        .bind(code, start, until, previous),
      database
        .prepare(
          `SELECT ${bucketExpr} AS bucket, COUNT(*) AS n
           FROM wub_click_event
           WHERE short_code = ?1 AND recorded_at >= ?2 AND recorded_at < ?3
           GROUP BY bucket
           ORDER BY bucket ASC`,
        )
        .bind(...current),
      database.prepare(dimensionSql("country", true)).bind(...current),
      database
        .prepare(
          `SELECT city AS key, COALESCE(country, '') AS country, COUNT(*) AS n
           FROM wub_click_event
           WHERE short_code = ?1
             AND recorded_at >= ?2
             AND recorded_at < ?3
             AND city IS NOT NULL
             AND city <> ''
             AND city <> 'unknown'
           GROUP BY city, COALESCE(country, '')
           ORDER BY n DESC, key ASC, country ASC
           LIMIT ${BREAKDOWN_LIMIT}`,
        )
        .bind(...current),
      database.prepare(dimensionSql("device", true)).bind(...current),
      database.prepare(dimensionSql("browser", true)).bind(...current),
      database.prepare(dimensionSql("os", true)).bind(...current),
      database.prepare(dimensionSql("referrer", false)).bind(...current),
    ])) as StatementResult[];

  const totalRow = rowsOf<TotalRow>(totals)[0];
  return {
    buckets: rowsOf<BucketRow>(buckets).map((row) => ({
      at: new Date(asNumber(row.bucket)),
      count: asNumber(row.n),
    })),
    total: asNumber(totalRow?.total),
    previousTotal: asNumber(totalRow?.previous_total),
    countries: ranked(rowsOf<CountRow>(countries)),
    cities: rowsOf<CityRow>(cities)
      .filter((row): row is CityRow & { key: string } => !!row.key)
      .map((row) => ({
        key: row.key,
        country: row.country ?? "",
        count: asNumber(row.n),
      })),
    devices: ranked(rowsOf<CountRow>(devices)),
    browsers: ranked(rowsOf<CountRow>(browsers)),
    os: ranked(rowsOf<CountRow>(os)),
    referrers: ranked(rowsOf<CountRow>(referrers)),
  };
}
