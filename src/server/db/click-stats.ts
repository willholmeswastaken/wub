import {
  type ClickRange,
  previousRangeStart,
  rangeStart,
} from "@/lib/click-date-range";
import {
  analyticsFromEvents,
  type ClickEventRow,
} from "@/server/analytics/query";
import { type ClickAnalytics } from "@/server/db/types";

export type StoredClick = {
  event_id: string;
  recorded_at: number;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
};

export function analyticsFromStoredClicks(
  rows: readonly StoredClick[],
  range: ClickRange,
  now = new Date(),
): ClickAnalytics {
  const start = rangeStart(range, now).getTime();
  const until = now.getTime();
  const previousStart = previousRangeStart(range, now).getTime();
  const current: ClickEventRow[] = [];
  let previousTotal = 0;
  for (const row of rows) {
    if (row.recorded_at >= start && row.recorded_at < until) {
      current.push(toClickEvent(row));
    } else if (row.recorded_at >= previousStart && row.recorded_at < start) {
      previousTotal += 1;
    }
  }
  return analyticsFromEvents(current, range, previousTotal);
}

function toClickEvent(row: StoredClick): ClickEventRow {
  return {
    timestamp: row.recorded_at,
    country: row.country,
    city: row.city,
    device: row.device,
    browser: row.browser,
    os: row.os,
    referrer: row.referrer,
  };
}
