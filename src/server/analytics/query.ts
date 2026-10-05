import { type ClickRange, clickBucketStart } from "@/lib/click-date-range";
import { type ClickAnalytics, type CountItem } from "@/server/db/types";

const BREAKDOWN_LIMIT = 50;

export type ClickEventRow = {
  timestamp?: number | string | null;
  country?: string | null;
  city?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  referrer?: string | null;
};

export function unixSecondsToIso(value: number | string): string {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  const milliseconds =
    Math.abs(numeric) > 10_000_000_000 ? numeric : numeric * 1000;
  return new Date(milliseconds).toISOString();
}

export function analyticsTimestamp(
  value: number | string | null | undefined,
): Date | null {
  if (value == null || value === "") return null;
  const text = String(value).trim();
  if (typeof value === "number" || /^-?\d+(\.\d+)?$/.test(text)) {
    const date = new Date(unixSecondsToIso(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const sql = text.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2}(?:\.\d+)?)(Z|[+-]\d{2}:?\d{2})?$/,
  );
  const parsed = sql
    ? new Date(`${sql[1]}T${sql[2]}${sql[3] ?? "Z"}`)
    : new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function eventField(
  row: ClickEventRow,
  name: keyof ClickEventRow,
): string | null {
  const value = row[name];
  if (value == null) return null;
  const text = String(value);
  return text === "" ? null : text;
}

function remember(
  counts: Map<string, number>,
  value: string | null,
  skipUnknown: boolean,
) {
  if (!value) return;
  if (skipUnknown && value === "unknown") return;
  counts.set(value, (counts.get(value) ?? 0) + 1);
}

function rankedCounts(counts: Map<string, number>): CountItem[] {
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, BREAKDOWN_LIMIT);
}

export function analyticsFromEvents(
  events: readonly ClickEventRow[],
  range: ClickRange,
  previousTotal: number,
): ClickAnalytics {
  const buckets = new Map<number, number>();
  const countries = new Map<string, number>();
  const cities = new Map<
    string,
    { city: string; country: string; count: number }
  >();
  const devices = new Map<string, number>();
  const browsers = new Map<string, number>();
  const os = new Map<string, number>();
  const referrers = new Map<string, number>();

  for (const event of events) {
    const at = analyticsTimestamp(event.timestamp);
    if (at) {
      const key = clickBucketStart(at, range).getTime();
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    const country = eventField(event, "country");
    const city = eventField(event, "city");
    remember(countries, country, true);
    if (city && city !== "unknown") {
      const cityKey = `${city}\0${country ?? ""}`;
      const current = cities.get(cityKey);
      if (current) current.count += 1;
      else cities.set(cityKey, { city, country: country ?? "", count: 1 });
    }
    remember(devices, eventField(event, "device"), true);
    remember(browsers, eventField(event, "browser"), true);
    remember(os, eventField(event, "os"), true);
    remember(referrers, eventField(event, "referrer"), false);
  }

  return {
    buckets: [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([time, count]) => ({ at: new Date(time), count })),
    total: events.length,
    previousTotal,
    countries: rankedCounts(countries),
    cities: [...cities.values()]
      .map(({ city, country, count }) => ({ key: city, country, count }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
      .slice(0, BREAKDOWN_LIMIT),
    devices: rankedCounts(devices),
    browsers: rankedCounts(browsers),
    os: rankedCounts(os),
    referrers: rankedCounts(referrers),
  };
}
