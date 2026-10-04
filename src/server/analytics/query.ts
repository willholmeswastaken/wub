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

function windowSql(bucket: "hour" | "day") {
  const bucketFn = bucket === "hour" ? "toStartOfHour" : "toStartOfDay";
  return `
    SELECT 'bucket' AS kind, toString(${bucketFn}(timestamp)) AS key, '' AS extra, SUM(_sample_interval) AS clicks
    FROM ${CLICK_DATASET}
    WHERE index1 = $code AND timestamp >= toDateTime($start) AND timestamp < toDateTime($until)
    GROUP BY ${bucketFn}(timestamp)
    UNION ALL
    SELECT 'country', blob1, '', SUM(_sample_interval)
    FROM ${CLICK_DATASET}
    WHERE index1 = $code AND timestamp >= toDateTime($start) AND timestamp < toDateTime($until)
      AND blob1 != '' AND blob1 != 'unknown'
    GROUP BY blob1
    UNION ALL
    SELECT 'city', blob2, blob1, SUM(_sample_interval)
    FROM ${CLICK_DATASET}
    WHERE index1 = $code AND timestamp >= toDateTime($start) AND timestamp < toDateTime($until)
      AND blob2 != '' AND blob2 != 'unknown'
    GROUP BY blob2, blob1
    UNION ALL
    SELECT 'device', blob3, '', SUM(_sample_interval)
    FROM ${CLICK_DATASET}
    WHERE index1 = $code AND timestamp >= toDateTime($start) AND timestamp < toDateTime($until)
      AND blob3 != '' AND blob3 != 'unknown'
    GROUP BY blob3
    UNION ALL
    SELECT 'browser', blob4, '', SUM(_sample_interval)
    FROM ${CLICK_DATASET}
    WHERE index1 = $code AND timestamp >= toDateTime($start) AND timestamp < toDateTime($until)
      AND blob4 != '' AND blob4 != 'unknown'
    GROUP BY blob4
    UNION ALL
    SELECT 'os', blob5, '', SUM(_sample_interval)
    FROM ${CLICK_DATASET}
    WHERE index1 = $code AND timestamp >= toDateTime($start) AND timestamp < toDateTime($until)
      AND blob5 != '' AND blob5 != 'unknown'
    GROUP BY blob5
    UNION ALL
    SELECT 'referrer', blob6, '', SUM(_sample_interval)
    FROM ${CLICK_DATASET}
    WHERE index1 = $code AND timestamp >= toDateTime($start) AND timestamp < toDateTime($until)
      AND blob6 != ''
    GROUP BY blob6
  `;
}

export function clickAnalyticsQuery(
  code: string,
  range: ClickRange,
  now = new Date(),
): AnalyticsQuery {
  const start = rangeStart(range, now);
  return {
    query: windowSql(range === "24h" ? "hour" : "day"),
    params: {
      code,
      start: start.toISOString(),
      until: now.toISOString(),
    },
  };
}

export function previousTotalQuery(
  code: string,
  range: ClickRange,
  now = new Date(),
): AnalyticsQuery {
  return {
    query: `
      SELECT SUM(_sample_interval) AS clicks
      FROM ${CLICK_DATASET}
      WHERE index1 = $code
        AND timestamp >= toDateTime($start)
        AND timestamp < toDateTime($until)
    `,
    params: {
      code,
      start: previousRangeStart(range, now).toISOString(),
      until: rangeStart(range, now).toISOString(),
    },
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
      SELECT index1 AS short_code, toString(toDate(timestamp)) AS day, SUM(_sample_interval) AS clicks
      FROM ${CLICK_DATASET}
      WHERE timestamp >= toDateTime($start)
        AND index1 IN (${names.join(", ")})
      GROUP BY short_code, day
    `,
    params,
  };
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
