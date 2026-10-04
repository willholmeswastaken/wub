import {
  type ClickRange,
  previousRangeStart,
  rangeStart,
} from "@/lib/click-date-range";
import {
  type CityCount,
  type ClickAnalytics,
  type ClickBucket,
  type CountItem,
} from "@/server/db/types";

export const CLICK_DATASET = `events.analyticsEngine."wub_clicks"`;

const BREAKDOWN_LIMIT = 50;

export type AnalyticsRow = {
  kind: string;
  key: string;
  extra: string;
  clicks: number | string;
};

export type AnalyticsQuery = {
  query: string;
  params: Record<string, string>;
};

// The Workers binding speaks the Analytics SQL API, not the older Analytics
// Engine SQL dialect. That API rejects toString, toDateTime, UNION, and
// _sample_interval. COUNT(*) is already sample-weighted, and a timestamp
// parameter is an ISO string compared directly.

const BREAKDOWNS = [
  {
    kind: "country",
    key: "blob1",
    extra: "''",
    filter: "blob1 != '' AND blob1 != 'unknown'",
    groupBy: "blob1",
  },
  {
    kind: "city",
    key: "blob2",
    extra: "blob1",
    filter: "blob2 != '' AND blob2 != 'unknown'",
    groupBy: "blob2, blob1",
  },
  {
    kind: "device",
    key: "blob3",
    extra: "''",
    filter: "blob3 != '' AND blob3 != 'unknown'",
    groupBy: "blob3",
  },
  {
    kind: "browser",
    key: "blob4",
    extra: "''",
    filter: "blob4 != '' AND blob4 != 'unknown'",
    groupBy: "blob4",
  },
  {
    kind: "os",
    key: "blob5",
    extra: "''",
    filter: "blob5 != '' AND blob5 != 'unknown'",
    groupBy: "blob5",
  },
  {
    kind: "referrer",
    key: "blob6",
    extra: "''",
    filter: "blob6 != ''",
    groupBy: "blob6",
  },
] as const;

function linkWindow(code: string, start: Date, until: Date) {
  return {
    code,
    start: start.toISOString(),
    until: until.toISOString(),
  };
}

export function clickAnalyticsQueries(
  code: string,
  range: ClickRange,
  now = new Date(),
): AnalyticsQuery[] {
  const params = linkWindow(code, rangeStart(range, now), now);
  const bucketFn = range === "24h" ? "toStartOfHour" : "toStartOfDay";
  const fromClause = `
    FROM ${CLICK_DATASET}
    WHERE index1 = $code
      AND timestamp >= $start
      AND timestamp < $until
  `;
  return [
    {
      query: `
        SELECT 'bucket' AS kind,
          toUnixTimestamp(${bucketFn}(timestamp)) AS key,
          '' AS extra,
          COUNT(*) AS clicks
        ${fromClause}
        GROUP BY key
      `,
      params,
    },
    ...BREAKDOWNS.map((breakdown) => ({
      query: `
        SELECT '${breakdown.kind}' AS kind,
          ${breakdown.key} AS key,
          ${breakdown.extra} AS extra,
          COUNT(*) AS clicks
        ${fromClause}
          AND ${breakdown.filter}
        GROUP BY ${breakdown.groupBy}
      `,
      params,
    })),
  ];
}

export function previousTotalQuery(
  code: string,
  range: ClickRange,
  now = new Date(),
): AnalyticsQuery {
  return {
    query: `
      SELECT COUNT(*) AS clicks
      FROM ${CLICK_DATASET}
      WHERE index1 = $code
        AND timestamp >= $start
        AND timestamp < $until
    `,
    params: linkWindow(
      code,
      previousRangeStart(range, now),
      rangeStart(range, now),
    ),
  };
}

export function sparklineQuery(
  codes: readonly string[],
  since: Date,
): AnalyticsQuery {
  const params: Record<string, string> = { start: since.toISOString() };
  const names = codes.map((code, index) => {
    const name = `code${index}`;
    params[name] = code;
    return `$${name}`;
  });
  return {
    query: `
      SELECT index1 AS short_code,
        toUnixTimestamp(toStartOfDay(timestamp)) AS bucket_day,
        COUNT(*) AS clicks
      FROM ${CLICK_DATASET}
      WHERE timestamp >= $start
        AND index1 IN (${names.join(", ")})
      GROUP BY index1, bucket_day
    `,
    params,
  };
}

export function unixSecondsToIso(value: number | string): string {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  const milliseconds =
    Math.abs(numeric) > 10_000_000_000 ? numeric : numeric * 1000;
  return new Date(milliseconds).toISOString();
}

export function sparklineDayKey(value: number | string): string {
  return unixSecondsToIso(value).slice(0, 10);
}

export function withIsoBucketKeys(
  rows: Array<Omit<AnalyticsRow, "key"> & { key: number | string }>,
): AnalyticsRow[] {
  return rows.map((row) =>
    row.kind === "bucket"
      ? { ...row, key: unixSecondsToIso(row.key) }
      : { ...row, key: String(row.key) },
  );
}

function asCount(value: number | string) {
  const count = typeof value === "number" ? value : Number(value);
  return Number.isFinite(count) ? count : 0;
}

function topCounts(rows: AnalyticsRow[], kind: string): CountItem[] {
  return rows
    .filter((row) => row.kind === kind && row.key)
    .map((row) => ({ key: row.key, count: asCount(row.clicks) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, BREAKDOWN_LIMIT);
}

export function analyticsFromRows(
  rows: AnalyticsRow[],
  previousTotal: number,
): Omit<ClickAnalytics, "previousTotal"> & { previousTotal: number } {
  const buckets: ClickBucket[] = rows
    .filter((row) => row.kind === "bucket" && row.key)
    .map((row) => ({ at: new Date(row.key), count: asCount(row.clicks) }))
    .filter((bucket) => !Number.isNaN(bucket.at.getTime()));
  const cities: CityCount[] = rows
    .filter((row) => row.kind === "city" && row.key)
    .map((row) => ({
      key: row.key,
      country: row.extra,
      count: asCount(row.clicks),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, BREAKDOWN_LIMIT);
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  return {
    buckets,
    total,
    previousTotal,
    countries: topCounts(rows, "country"),
    cities,
    devices: topCounts(rows, "device"),
    browsers: topCounts(rows, "browser"),
    os: topCounts(rows, "os"),
    referrers: topCounts(rows, "referrer"),
  };
}
