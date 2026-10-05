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
    value: "blob1",
    filter: "blob1 != '' AND blob1 != 'unknown'",
    groupBy: "blob1",
  },
  {
    kind: "city",
    value: "blob2",
    country: "blob1",
    filter: "blob2 != '' AND blob2 != 'unknown'",
    groupBy: "blob2, blob1",
  },
  {
    kind: "device",
    value: "blob3",
    filter: "blob3 != '' AND blob3 != 'unknown'",
    groupBy: "blob3",
  },
  {
    kind: "browser",
    value: "blob4",
    filter: "blob4 != '' AND blob4 != 'unknown'",
    groupBy: "blob4",
  },
  {
    kind: "os",
    value: "blob5",
    filter: "blob5 != '' AND blob5 != 'unknown'",
    groupBy: "blob5",
  },
  {
    kind: "referrer",
    value: "blob6",
    filter: "blob6 != ''",
    groupBy: "blob6",
  },
] as const;

export type ClickAnalyticsQuery = AnalyticsQuery & {
  kind: "bucket" | (typeof BREAKDOWNS)[number]["kind"];
};

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
): ClickAnalyticsQuery[] {
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
      kind: "bucket",
      // Constants in the SELECT list are not grouped columns. The SQL API
      // rejects them, so the kind is attached in JavaScript instead.
      query: `
        SELECT toUnixTimestamp(${bucketFn}(timestamp)) AS bucket,
          COUNT(*) AS clicks
        ${fromClause}
        GROUP BY bucket
      `,
      params,
    },
    ...BREAKDOWNS.map((breakdown) => ({
      kind: breakdown.kind,
      query: `
        SELECT ${breakdown.value} AS dimension,
          ${"country" in breakdown ? `${breakdown.country} AS country,` : ""}
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

type AnalyticsResultRow = Record<string, number | string | null | undefined>;

export function toAnalyticsRows(
  kind: string,
  rows: readonly AnalyticsResultRow[],
): AnalyticsRow[] {
  return rows.flatMap((row) => {
    const clicks = row.clicks ?? 0;
    if (kind === "bucket") {
      if (row.bucket == null) return [];
      return [
        {
          kind,
          key: unixSecondsToIso(row.bucket),
          extra: "",
          clicks,
        },
      ];
    }
    if (row.dimension == null || row.dimension === "") return [];
    return [
      {
        kind,
        key: String(row.dimension),
        extra: row.country == null ? "" : String(row.country),
        clicks,
      },
    ];
  });
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
