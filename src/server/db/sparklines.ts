import { type UserLink } from "./types";

export const SPARKLINE_DAYS = 7;

type UserLinkRow = {
  short_code: string;
  url: string;
  created_at: Date | number;
  click_count: number;
  last_clicked: Date | number | null;
};

type ClickStamp = {
  short_code: string;
  timestamp: Date | number | null;
};

function asDate(value: Date | number): Date {
  return value instanceof Date ? value : new Date(value);
}

function asDateOrNull(value: Date | number | null): Date | null {
  if (value == null) return null;
  return asDate(value);
}

export function sparklineDayKeys(now = new Date(), count = SPARKLINE_DAYS) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now);
    date.setUTCDate(now.getUTCDate() - (count - 1 - index));
    return date.toISOString().slice(0, 10);
  });
}

export function sparklineSince(now = new Date()) {
  const [firstDay] = sparklineDayKeys(now);
  return new Date(`${firstDay}T00:00:00.000Z`);
}

export function countClicksByDay(
  timestamps: Array<Date | number | null>,
  days: readonly string[],
) {
  const counts = new Map<string, number>();
  for (const timestamp of timestamps) {
    if (timestamp == null) continue;
    const key = (timestamp instanceof Date ? timestamp : new Date(timestamp))
      .toISOString()
      .slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return days.map((day) => counts.get(day) ?? 0);
}

export function userLinksWithSparklines(
  rows: UserLinkRow[],
  clicks: ClickStamp[],
  now = new Date(),
): UserLink[] {
  const days = sparklineDayKeys(now);
  const byCode = new Map<string, Array<Date | number | null>>();
  for (const click of clicks) {
    const stamps = byCode.get(click.short_code) ?? [];
    stamps.push(click.timestamp);
    byCode.set(click.short_code, stamps);
  }

  return rows.map((row) => ({
    short_code: row.short_code,
    url: row.url,
    created_at: asDate(row.created_at),
    click_count: row.click_count,
    last_clicked: asDateOrNull(row.last_clicked),
    recentClicks: countClicksByDay(byCode.get(row.short_code) ?? [], days),
  }));
}

export function userLinksWithSparklineCounts(
  rows: UserLinkRow[],
  counts: Array<{ short_code: string; day: string; count: number }>,
  now = new Date(),
): UserLink[] {
  const days = sparklineDayKeys(now);
  const byCode = new Map<string, Map<string, number>>();
  for (const count of counts) {
    const daysForCode = byCode.get(count.short_code) ?? new Map();
    daysForCode.set(count.day, (daysForCode.get(count.day) ?? 0) + count.count);
    byCode.set(count.short_code, daysForCode);
  }

  return rows.map((row) => ({
    short_code: row.short_code,
    url: row.url,
    created_at: asDate(row.created_at),
    click_count: row.click_count,
    last_clicked: asDateOrNull(row.last_clicked),
    recentClicks: days.map((day) => byCode.get(row.short_code)?.get(day) ?? 0),
  }));
}
