import { format, startOfDay, startOfHour, subDays, subHours } from "date-fns";

export type DateObject = {
  date: string;
  clicks: number;
};

export const CLICK_RANGES = ["24h", "7d", "30d", "90d"] as const;
export type ClickRange = (typeof CLICK_RANGES)[number];
export const DEFAULT_CLICK_RANGE: ClickRange = "30d";

export const clickRangeLabel: Record<ClickRange, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

export function parseClickRange(value: string | undefined): ClickRange {
  return CLICK_RANGES.includes(value as ClickRange)
    ? (value as ClickRange)
    : DEFAULT_CLICK_RANGE;
}

function bucketCount(range: ClickRange) {
  return range === "24h" ? 24 : Number.parseInt(range, 10);
}

export function rangeStart(range: ClickRange, now = new Date()) {
  const count = bucketCount(range);
  return range === "24h"
    ? subHours(startOfHour(now), count - 1)
    : subDays(startOfDay(now), count - 1);
}

export function previousRangeStart(range: ClickRange, now = new Date()) {
  const start = rangeStart(range, now);
  const count = bucketCount(range);
  return range === "24h" ? subHours(start, count) : subDays(start, count);
}

export function generateClickBuckets(
  range: ClickRange,
  totalClicks: { timestamp: Date | null }[],
  now = new Date(),
): DateObject[] {
  const hourly = range === "24h";
  const keyOf = (date: Date) =>
    (hourly ? startOfHour(date) : startOfDay(date)).getTime();

  const counts = new Map<number, number>();
  for (const click of totalClicks) {
    if (!click.timestamp) continue;
    const key = keyOf(click.timestamp);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const start = rangeStart(range, now);
  return Array.from({ length: bucketCount(range) }, (_, index) => {
    const date = hourly ? subHours(start, -index) : subDays(start, -index);
    return {
      date: format(date, hourly ? "HH:mm" : "d MMM"),
      clicks: counts.get(keyOf(date)) ?? 0,
    };
  });
}
