import { type StoredClick } from "./click-stats";
import { type ClickStatementDatabase } from "./record-click-sql";

const LOAD_CLICKS_SQL = `
SELECT event_id, recorded_at, country, city, device, browser, os, referrer
FROM wub_click_event
WHERE short_code = ?1
  AND recorded_at >= ?2
  AND recorded_at < ?3
`;

const USER_STAMPS_SQL = `
SELECT e.short_code AS short_code, e.recorded_at AS recorded_at
FROM wub_click_event e
INNER JOIN wub_link l ON l.short_code = e.short_code
WHERE l."userId" = ?1
  AND e.recorded_at >= ?2
`;

type ClickRow = {
  event_id: string;
  recorded_at: number | string | null;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
};

export async function loadStoredClicks(
  database: ClickStatementDatabase,
  code: string,
  since: Date,
  until: Date,
): Promise<StoredClick[]> {
  const result = await database
    .prepare(LOAD_CLICKS_SQL)
    .bind(code, since.getTime(), until.getTime())
    .all<ClickRow>();
  return (result.results ?? []).map((row) => ({
    event_id: row.event_id,
    recorded_at: asMillis(row.recorded_at),
    country: row.country,
    city: row.city,
    device: row.device,
    browser: row.browser,
    os: row.os,
    referrer: row.referrer,
  }));
}

export async function loadUserClickStamps(
  database: ClickStatementDatabase,
  userId: string,
  since: Date,
) {
  const result = await database
    .prepare(USER_STAMPS_SQL)
    .bind(userId, since.getTime())
    .all<{ short_code: string; recorded_at: number | string | null }>();
  return (result.results ?? []).map((row) => ({
    short_code: row.short_code,
    timestamp: asMillis(row.recorded_at),
  }));
}

function asMillis(value: number | string | null) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.abs(numeric) > 10_000_000_000 ? numeric : numeric * 1000;
}
