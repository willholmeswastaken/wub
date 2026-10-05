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

export type ImportedClick = {
  at: number;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
};

export type DimensionUpdate = {
  event_id: string;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  referrer: string;
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

export function needsDimensionBackfill(rows: readonly StoredClick[]) {
  return rows.some((row) => row.referrer == null);
}

// Analytics Engine keeps several resolutions of the same dataset and may
// answer with a different one on each request. Only a sample the same size
// as the D1 log is safe to copy; anything shorter is ignored so a thin
// sample cannot wipe out a later full one.
export function dimensionBackfill(
  stored: readonly StoredClick[],
  imported: readonly ImportedClick[],
): DimensionUpdate[] | null {
  if (!needsDimensionBackfill(stored)) return [];
  if (imported.length !== stored.length) return null;
  const storedOrder = [...stored].sort(byTime);
  const importedOrder = [...imported].sort((a, b) => a.at - b.at);
  const updates: DimensionUpdate[] = [];
  for (const [index, row] of storedOrder.entries()) {
    if (row.referrer != null) continue;
    const source = importedOrder[index];
    if (!source) return null;
    updates.push({
      event_id: row.event_id,
      country: source.country,
      city: source.city,
      device: source.device,
      browser: source.browser,
      os: source.os,
      referrer: source.referrer?.trim() ? source.referrer : "direct",
    });
  }
  return updates;
}

function byTime(a: StoredClick, b: StoredClick) {
  return a.recorded_at - b.recorded_at || a.event_id.localeCompare(b.event_id);
}

export function clicksWithDimensions(
  rows: readonly StoredClick[],
  updates: readonly DimensionUpdate[],
): StoredClick[] {
  const byId = new Map(updates.map((update) => [update.event_id, update]));
  return rows.map((row) => {
    const update = byId.get(row.event_id);
    if (!update) return row;
    return { ...row, ...update };
  });
}
