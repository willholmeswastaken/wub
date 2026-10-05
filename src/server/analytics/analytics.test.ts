import { expect, test } from "bun:test";

import {
  fillClickBuckets,
  previousRangeStart,
  rangeStart,
} from "@/lib/click-date-range";
import { analyticsFromEvents } from "@/server/analytics/query";

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
