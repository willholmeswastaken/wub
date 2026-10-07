import { expect, test } from "bun:test";

import {
  formatWindowDelta,
  recentWindowTotals,
  seriesTotal,
  sumSeries,
  windowDeltaCaption,
} from "@/lib/click-delta";

test("a 7-day sparkline compares the last 3 days with the 3 before them", () => {
  const totals = recentWindowTotals([1, 2, 3, 4, 5, 6, 7]);
  expect(totals).toEqual({ current: 18, previous: 9, window: 3 });
  expect(seriesTotal([1, 2, 3, 4, 5, 6, 7])).toBe(28);
  expect(formatWindowDelta(totals.current, totals.previous)).toEqual({
    label: "+100%",
    tone: "up",
  });
});

test("prior window of zero is New, and a quiet week has no delta", () => {
  expect(formatWindowDelta(4, 0)).toEqual({ label: "New", tone: "up" });
  expect(formatWindowDelta(0, 0)).toBeNull();
  expect(recentWindowTotals([0, 0, 0, 0, 0, 0, 4])).toEqual({
    current: 4,
    previous: 0,
    window: 3,
  });
});

test("declines and flat weeks stay honest", () => {
  expect(formatWindowDelta(3, 15)).toEqual({ label: "-80%", tone: "down" });
  expect(formatWindowDelta(1, 3)).toEqual({ label: "-67%", tone: "down" });
  expect(formatWindowDelta(6, 6)).toEqual({ label: "0%", tone: "flat" });
  expect(formatWindowDelta(6, 6, { hideFlat: true })).toBeNull();
});

test("dashboard totals line up day by day", () => {
  expect(
    sumSeries([
      [1, 0, 2],
      [0, 4],
    ]),
  ).toEqual([1, 4, 2]);
  expect(windowDeltaCaption(3)).toBe("last 3 days vs the prior 3 days");
});
