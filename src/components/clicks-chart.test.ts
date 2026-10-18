import { expect, test } from "bun:test";

import {
  CHART_PAD_X,
  CHART_VIEW_W,
  chartIndexForViewX,
} from "@/components/clicks-chart";

test("chart hover follows the plot instead of the svg padding", () => {
  const points = 30;
  expect(chartIndexForViewX(CHART_PAD_X, points)).toBe(0);
  expect(chartIndexForViewX(CHART_VIEW_W - CHART_PAD_X, points)).toBe(
    points - 1,
  );
  expect(chartIndexForViewX(0, points)).toBe(0);
  expect(chartIndexForViewX(CHART_VIEW_W, points)).toBe(points - 1);

  const oldIndex = Math.round((CHART_PAD_X / CHART_VIEW_W) * (points - 1));
  expect(oldIndex === 0).toBe(false);
  expect(chartIndexForViewX(CHART_PAD_X, points)).toBe(0);
});
