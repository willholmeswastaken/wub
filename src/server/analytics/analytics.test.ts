import { expect, test } from "bun:test";

import { previousRangeStart, rangeStart } from "@/lib/click-date-range";
import {
  CLICK_BLOB_FIELDS,
  clickDataPoint,
} from "@/server/analytics/datapoint";
import {
  analyticsFromRows,
  clickAnalyticsQueries,
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

test("analytics SQL uses the Analytics SQL API dialect", () => {
  const now = new Date("2026-10-04T12:00:00Z");
  const queries = clickAnalyticsQueries("docs", "7d", now);
  expect(queries).toHaveLength(7);
  for (const query of queries) {
    expect(query.params.code).toBe("docs");
    expect(query.params.start).toBe(rangeStart("7d", now).toISOString());
    expectSqlApi(query.query);
    expect(query.query).toContain("COUNT(*)");
    expect(query.query).toContain("timestamp >= $start");
  }
  expect(queries.some((query) => query.query.includes("UNION"))).toBe(false);
  expect(queries.some((query) => query.query.includes(" AS kind"))).toBe(false);
  expect(queries.some((query) => query.query.includes(" AS key"))).toBe(false);
  expect(queries[0]?.kind).toBe("bucket");
  expect(queries[0]?.query).toContain(
    "toUnixTimestamp(toStartOfDay(timestamp)) AS bucket",
  );
  expect(queries[0]?.query).toContain("GROUP BY bucket");
  const city = queries.find((query) => query.kind === "city");
  expect(city?.query).toContain("blob2 AS dimension");
  expect(city?.query).toContain("blob1 AS country");
  expect(city?.query).toContain("GROUP BY blob2, blob1");
  const hourly = clickAnalyticsQueries("docs", "24h", now);
  expect(hourly[0]?.query).toContain(
    "toUnixTimestamp(toStartOfHour(timestamp))",
  );

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
