import { expect, test } from "bun:test";

import {
  CLICK_BLOB_FIELDS,
  clickDataPoint,
} from "@/server/analytics/datapoint";
import {
  analyticsFromRows,
  clickAnalyticsQuery,
  previousTotalQuery,
  sparklineQuery,
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

test("analytics SQL counts sampled rows for one link", () => {
  const query = clickAnalyticsQuery(
    "docs",
    "7d",
    new Date("2026-10-04T12:00:00Z"),
  );
  expect(query.query).toContain("SUM(_sample_interval)");
  expect(query.query).toContain("index1 = $code");
  expect(query.params.code).toBe("docs");
  const previous = previousTotalQuery(
    "docs",
    "7d",
    new Date("2026-10-04T12:00:00Z"),
  );
  expect(previous.query).toContain("SUM(_sample_interval)");
  const sparkline = sparklineQuery(
    ["docs", "blog"],
    new Date("2026-09-28T00:00:00Z"),
  );
  expect(sparkline.query).toContain("index1 IN ($code0, $code1)");
  expect(sparkline.params.code1).toBe("blog");
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
