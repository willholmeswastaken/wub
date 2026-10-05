import { expect, test } from "bun:test";

import {
  fillClickBuckets,
  previousRangeStart,
  rangeStart,
} from "@/lib/click-date-range";
import {
  CLICK_BLOB_FIELDS,
  clickDataPoint,
} from "@/server/analytics/datapoint";
import {
  analyticsFromEvents,
  analyticsFromRows,
  clickEventsQuery,
  isAnalyticsRetryable,
  previousTotalQuery,
  sparklineDayKey,
  sparklineQuery,
  toAnalyticsRows,
} from "@/server/analytics/query";
import { type LogClickEvent } from "@/server/queue/schema";

const event: LogClickEvent = {
  event_id: "11111111-1111-4111-8111-111111111111",
  short_code: "docs",
  userAgent: "Mozilla",
  country: "US",
  city: "Austin",
  region: "TX",
  latitude: "30",
  longitude: "-97",
  device: "mobile",
  device_vendor: "unknown",
  device_model: "unknown",
  browser: "Chrome",
  browser_version: "1",
  engine: "Blink",
  engine_version: "1",
  os: "iOS",
  os_version: "17",
  cpu_architecture: "unknown",
  referrer: "github.com",
};

test("click datapoints keep a stable blob order and index by short code", () => {
  const point = clickDataPoint(event);
  expect(CLICK_BLOB_FIELDS).toEqual([
    "country",
    "city",
    "device",
    "browser",
    "os",
    "referrer",
  ]);
  expect(point.indexes).toEqual(["docs"]);
  expect(point.doubles).toEqual([1]);
  expect(point.blobs).toEqual([
    "US",
    "Austin",
    "mobile",
    "Chrome",
    "iOS",
    "github.com",
  ]);
});

test("analytics SQL reads each click instead of grouping in the engine", () => {
  const now = new Date("2026-10-04T12:00:00.000Z");
  const query = clickEventsQuery("docs", "7d", now);
  expect(query.params.code).toBe("docs");
  expect(query.params.start).toBe(rangeStart("7d", now).toISOString());
  expect(query.params.until).toBe(now.toISOString());
  expectSqlApi(query.query);
  expect(query.query).toContain("blob1 AS country");
  expect(query.query).toContain("blob2 AS city");
  expect(query.query).toContain("blob6 AS referrer");
  expect(query.query).toContain("timestamp >= $start");
  expect(query.query).toContain("ORDER BY timestamp");
  expect(query.query).toContain("LIMIT 10000");
  expect(query.query.includes("GROUP BY")).toBe(false);
  expect(query.query.includes("COUNT(*)")).toBe(false);
  expect(query.query.includes("toUnixTimestamp")).toBe(false);
  expect(query.query.includes("toStartOfDay")).toBe(false);
  expect(query.query.includes("toStartOfHour")).toBe(false);
  const hourly = clickEventsQuery("docs", "24h", now);
  expect(hourly.params.start).toBe(rangeStart("24h", now).toISOString());
  expect(hourly.query.includes("GROUP BY")).toBe(false);

  const previous = previousTotalQuery("docs", "7d", now);
  expectSqlApi(previous.query);
  expect(previous.query).toContain("COUNT(*)");
  expect(previous.params.start).toBe(
    previousRangeStart("7d", now).toISOString(),
  );

  const sparkline = sparklineQuery(
    ["docs", "blog"],
    new Date("2026-09-28T00:00:00Z"),
  );
  expectSqlApi(sparkline.query);
  expect(sparkline.query).toContain("COUNT(*)");
  expect(sparkline.query).toContain("toUnixTimestamp(toStartOfDay(timestamp))");
  expect(sparkline.query).toContain("index1 IN ($code0, $code1)");
  expect(sparkline.params.start).toBe("2026-09-28T00:00:00.000Z");
  expect(sparkline.params.code1).toBe("blog");
});

test("click windows stay on UTC day and hour boundaries", () => {
  const now = new Date("2026-10-04T12:30:00.000Z");
  expect(rangeStart("7d", now).toISOString()).toBe("2026-09-28T00:00:00.000Z");
  expect(rangeStart("24h", now).toISOString()).toBe("2026-10-03T13:00:00.000Z");
  expect(previousRangeStart("7d", now).toISOString()).toBe(
    "2026-09-21T00:00:00.000Z",
  );
  const chart = fillClickBuckets(
    "7d",
    [{ at: new Date("2026-10-04T18:00:00.000Z"), count: 2 }],
    now,
  );
  expect(chart).toHaveLength(7);
  expect(chart[6]).toEqual({ date: "4 Oct", clicks: 2 });
  expect(chart[0]?.clicks).toBe(0);
});

test("sparkline days and buckets convert unix seconds to UTC", () => {
  const start = Date.parse("2026-10-04T00:00:00.000Z") / 1000;
  expect(sparklineDayKey(start)).toBe("2026-10-04");
  expect(sparklineDayKey(String(start))).toBe("2026-10-04");
  expect(toAnalyticsRows("bucket", [{ bucket: start, clicks: 4 }])).toEqual([
    {
      kind: "bucket",
      key: "2026-10-04T00:00:00.000Z",
      extra: "",
      clicks: 4,
    },
  ]);
  expect(
    toAnalyticsRows("city", [
      { dimension: "Austin", country: "US", clicks: 3 },
    ]),
  ).toEqual([{ kind: "city", key: "Austin", extra: "US", clicks: 3 }]);
});

function expectSqlApi(query: string) {
  expect(query.includes("toString(")).toBe(false);
  expect(query.includes("toDateTime(")).toBe(false);
  expect(query.includes("_sample_interval")).toBe(false);
  expect(query.includes("UNION")).toBe(false);
  expect(query.includes(" AS kind")).toBe(false);
  expect(query.includes(" AS key")).toBe(false);
}

test("click events aggregate in UTC and still count an unreadable timestamp", () => {
  const analytics = analyticsFromEvents(
    [
      {
        timestamp: "2026-10-04 00:00:00",
        country: "US",
        city: "Austin",
        device: "mobile",
        browser: "Chrome",
        os: "iOS",
        referrer: "github.com",
      },
      {
        timestamp: "2026-10-04T18:00:00.000Z",
        country: "US",
        city: "Austin",
        device: "mobile",
        browser: "Chrome",
        os: "iOS",
        referrer: "direct",
      },
      {
        timestamp: "not-a-date",
        country: "unknown",
        city: "unknown",
        device: "",
        browser: "unknown",
        os: "unknown",
        referrer: "",
      },
    ],
    "7d",
    1,
  );
  expect(analytics.total).toBe(3);
  expect(analytics.previousTotal).toBe(1);
  expect(analytics.buckets).toEqual([
    { at: new Date("2026-10-04T00:00:00.000Z"), count: 2 },
  ]);
  expect(analytics.countries).toEqual([{ key: "US", count: 2 }]);
  expect(analytics.cities).toEqual([
    { key: "Austin", country: "US", count: 2 },
  ]);
  expect(analytics.devices).toEqual([{ key: "mobile", count: 2 }]);
  expect(analytics.referrers).toEqual([
    { key: "direct", count: 1 },
    { key: "github.com", count: 1 },
  ]);

  const hourly = analyticsFromEvents(
    [
      {
        timestamp: "2026-10-04 15:10:00",
        country: "GB",
        city: "London",
        device: "desktop",
        browser: "Firefox",
        os: "Windows",
        referrer: "direct",
      },
      {
        timestamp: 1_791_129_000,
        country: "US",
        city: "Austin",
        device: "mobile",
        browser: "Chrome",
        os: "iOS",
        referrer: "direct",
      },
    ],
    "24h",
    0,
  );
  expect(hourly.buckets).toEqual([
    { at: new Date("2026-10-04T15:00:00.000Z"), count: 2 },
  ]);
  expect(hourly.cities).toEqual([
    { key: "Austin", country: "US", count: 1 },
    { key: "London", country: "GB", count: 1 },
  ]);
});

test("transient analytics errors are retried and rejected SQL is not", () => {
  expect(isAnalyticsRetryable({ retryable: false })).toBe(false);
  expect(isAnalyticsRetryable({ retryable: true, status: 422 })).toBe(true);
  expect(isAnalyticsRetryable({ status: 429 })).toBe(true);
  expect(isAnalyticsRetryable({ status: 422 })).toBe(false);
  expect(isAnalyticsRetryable(new Error("503 Service Unavailable"))).toBe(true);
  expect(isAnalyticsRetryable(new Error("422 invalid SQL"))).toBe(false);
  expect(isAnalyticsRetryable(new Error("not authorized"))).toBe(false);
  expect(isAnalyticsRetryable(new Error("socket hang up"))).toBe(true);
});

test("analytics rows fill the dashboard breakdown shape", () => {
  const analytics = analyticsFromRows(
    [
      {
        kind: "bucket",
        key: "2026-10-04T00:00:00.000Z",
        extra: "",
        clicks: "4",
      },
      { kind: "country", key: "US", extra: "", clicks: 3 },
      { kind: "country", key: "unknown", extra: "", clicks: 1 },
      { kind: "city", key: "Austin", extra: "US", clicks: 3 },
      { kind: "device", key: "mobile", extra: "", clicks: 2 },
      { kind: "browser", key: "Chrome", extra: "", clicks: 2 },
      { kind: "os", key: "iOS", extra: "", clicks: 2 },
      { kind: "referrer", key: "direct", extra: "", clicks: 1 },
    ],
    9,
  );
  expect(analytics.total).toBe(4);
  expect(analytics.previousTotal).toBe(9);
  expect(analytics.countries).toEqual([
    { key: "US", count: 3 },
    { key: "unknown", count: 1 },
  ]);
  expect(analytics.cities).toEqual([
    { key: "Austin", country: "US", count: 3 },
  ]);
  expect(analytics.buckets[0]?.count).toBe(4);
  expect(analytics.referrers).toEqual([{ key: "direct", count: 1 }]);
});
