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

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function parseClickRange(value: string | undefined): ClickRange {
  return CLICK_RANGES.includes(value as ClickRange)
    ? (value as ClickRange)
    : DEFAULT_CLICK_RANGE;
}

function bucketCount(range: ClickRange) {
  return range === "24h" ? 24 : Number.parseInt(range, 10);
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function startOfUtcHour(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
    ),
  );
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addUtcHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 3_600_000);
}

export function clickBucketStart(date: Date, range: ClickRange) {
  return range === "24h" ? startOfUtcHour(date) : startOfUtcDay(date);
}

function formatUtcBucket(date: Date, hourly: boolean) {
  if (hourly) {
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

export function rangeStart(range: ClickRange, now = new Date()) {
  const count = bucketCount(range);
  return range === "24h"
    ? addUtcHours(startOfUtcHour(now), -(count - 1))
    : addUtcDays(startOfUtcDay(now), -(count - 1));
}

export function previousRangeStart(range: ClickRange, now = new Date()) {
  const start = rangeStart(range, now);
  const count = bucketCount(range);
  return range === "24h"
    ? addUtcHours(start, -count)
    : addUtcDays(start, -count);
}

export function fillClickBuckets(
  range: ClickRange,
  counts: { at: Date; count: number }[],
  now = new Date(),
): DateObject[] {
  const hourly = range === "24h";
  const keyOf = (date: Date) => clickBucketStart(date, range).getTime();

  const totals = new Map<number, number>();
  for (const bucket of counts) {
    const key = keyOf(bucket.at);
    totals.set(key, (totals.get(key) ?? 0) + bucket.count);
  }

  const start = rangeStart(range, now);
  return Array.from({ length: bucketCount(range) }, (_, index) => {
    const date = hourly ? addUtcHours(start, index) : addUtcDays(start, index);
    return {
      date: formatUtcBucket(date, hourly),
      clicks: totals.get(keyOf(date)) ?? 0,
    };
  });
}
