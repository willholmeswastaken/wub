import {
  type ClickRange,
  clickBucketStart,
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
const EVENT_ROW_LIMIT = 10_000;

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

export type ClickEventRow = {
  timestamp?: number | string | null;
  country?: string | null;
  city?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  referrer?: string | null;
};

// The Workers binding speaks the Analytics SQL API, not the older Analytics
// Engine SQL dialect. That API rejects toString, toDateTime, UNION, and
// _sample_interval. COUNT(*) is already sample-weighted, and a timestamp
// parameter is an ISO string compared directly.
//
// A grouped breakdown is sampled when the query is too complex, so one
// request can return the clicks and the next request can return none. The
// page then draws that empty result as zero. Read the events and aggregate
// them here instead.

function linkWindow(code: string, start: Date, until: Date) {
  return {
    code,
    start: start.toISOString(),
    until: until.toISOString(),
  };
}

export function clickEventsQuery(
  code: string,
  range: ClickRange,
  now = new Date(),
): AnalyticsQuery {
  return {
    query: `
      SELECT timestamp,
        blob1 AS country,
        blob2 AS city,
        blob3 AS device,
        blob4 AS browser,
        blob5 AS os,
        blob6 AS referrer
      FROM ${CLICK_DATASET}
      WHERE index1 = $code
        AND timestamp >= $start
        AND timestamp < $until
      ORDER BY timestamp
      LIMIT ${EVENT_ROW_LIMIT}
    `,
    params: linkWindow(code, rangeStart(range, now), now),
  };
}

export function clickCountQuery(
  code: string,
  start: Date,
  until: Date,
): AnalyticsQuery {
  return {
    query: `
      SELECT COUNT(*) AS clicks
      FROM ${CLICK_DATASET}
      WHERE index1 = $code
        AND timestamp >= $start
        AND timestamp < $until
    `,
    params: linkWindow(code, start, until),
  };
}

export function previousTotalQuery(
  code: string,
  range: ClickRange,
  now = new Date(),
): AnalyticsQuery {
  return clickCountQuery(
    code,
    previousRangeStart(range, now),
    rangeStart(range, now),
  );
}

export function currentTotalQuery(
  code: string,
  range: ClickRange,
  now = new Date(),
): AnalyticsQuery {
  return clickCountQuery(code, rangeStart(range, now), now);
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

export function analyticsTimestamp(
  value: number | string | null | undefined,
): Date | null {
  if (value == null || value === "") return null;
  const text = String(value).trim();
  if (typeof value === "number" || /^-?\d+(\.\d+)?$/.test(text)) {
    const date = new Date(unixSecondsToIso(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const sql = text.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2}(?:\.\d+)?)(Z|[+-]\d{2}:?\d{2})?$/,
  );
  const parsed = sql
    ? new Date(`${sql[1]}T${sql[2]}${sql[3] ?? "Z"}`)
    : new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isAnalyticsRetryable(cause: unknown): boolean {
  if (cause && typeof cause === "object") {
    const record = cause as {
      retryable?: unknown;
      status?: unknown;
      code?: unknown;
    };
    if (record.retryable === true) return true;
    if (record.retryable === false) return false;
    const status = Number(record.status ?? record.code);
    if (status === 429 || status === 500 || status === 503 || status === 507) {
      return true;
    }
    if (status === 400 || status === 403 || status === 422 || status === 501) {
      return false;
    }
  }
  const message = (
    cause instanceof Error ? cause.message : String(cause ?? "")
  ).toLowerCase();
  if (/\b(400|403|422|501)\b/.test(message)) return false;
  if (
    message.includes("invalid") ||
    message.includes("unsupported") ||
    message.includes("not authorized") ||
    message.includes("binding is missing")
  ) {
    return false;
  }
  return true;
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

function eventField(
  row: ClickEventRow,
  name: keyof ClickEventRow,
  fallback: string,
): string | null {
  const record = row as Record<string, unknown>;
  const value = record[name] ?? record[fallback];
  if (value == null) return null;
  const text = String(value);
  return text === "" ? null : text;
}

function eventTimestamp(row: ClickEventRow): Date | null {
  const record = row as Record<string, number | string | null | undefined>;
  return analyticsTimestamp(record.timestamp ?? record.Timestamp);
}

function remember(
  counts: Map<string, number>,
  value: string | null,
  skipUnknown: boolean,
) {
  if (!value) return;
  if (skipUnknown && value === "unknown") return;
  counts.set(value, (counts.get(value) ?? 0) + 1);
}

function rankedCounts(counts: Map<string, number>): CountItem[] {
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, BREAKDOWN_LIMIT);
}

export function analyticsFromEvents(
  events: readonly ClickEventRow[],
  range: ClickRange,
  previousTotal: number,
): ClickAnalytics {
  const buckets = new Map<number, number>();
  const countries = new Map<string, number>();
  const cities = new Map<
    string,
    { city: string; country: string; count: number }
  >();
  const devices = new Map<string, number>();
  const browsers = new Map<string, number>();
  const os = new Map<string, number>();
  const referrers = new Map<string, number>();

  for (const event of events) {
    const at = eventTimestamp(event);
    if (at) {
      const key = clickBucketStart(at, range).getTime();
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    const country = eventField(event, "country", "blob1");
    const city = eventField(event, "city", "blob2");
    remember(countries, country, true);
    if (city && city !== "unknown") {
      const cityKey = `${city}\0${country ?? ""}`;
      const current = cities.get(cityKey);
      if (current) current.count += 1;
      else cities.set(cityKey, { city, country: country ?? "", count: 1 });
    }
    remember(devices, eventField(event, "device", "blob3"), true);
    remember(browsers, eventField(event, "browser", "blob4"), true);
    remember(os, eventField(event, "os", "blob5"), true);
    remember(referrers, eventField(event, "referrer", "blob6"), false);
  }

  return {
    buckets: [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([time, count]) => ({ at: new Date(time), count })),
    total: events.length,
    previousTotal,
    countries: rankedCounts(countries),
    cities: [...cities.values()]
      .map(({ city, country, count }) => ({ key: city, country, count }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
      .slice(0, BREAKDOWN_LIMIT),
    devices: rankedCounts(devices),
    browsers: rankedCounts(browsers),
    os: rankedCounts(os),
    referrers: rankedCounts(referrers),
  };
}
