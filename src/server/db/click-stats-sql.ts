import { type StoredClick } from "./click-stats";
import { type ClickStatementDatabase } from "./record-click-sql";

// INDEXED BY keeps the range on (short_code, recorded_at). A short_code-only
// plan would read every click this link has ever received.
export const LOAD_CLICKS_SQL = `
SELECT event_id, recorded_at, country, city, device, browser, os, referrer
FROM wub_click_event INDEXED BY click_event_code_time_idx
WHERE short_code = ?1
  AND recorded_at >= ?2
  AND recorded_at < ?3
`;

// One count per link per UTC day. CROSS JOIN keeps the user's links on the
// outer side so the click log is a per-code range, not a scan of every event.
export const USER_CLICK_COUNTS_SQL = `
SELECT l.short_code AS short_code,
       strftime('%Y-%m-%d', e.recorded_at / 1000, 'unixepoch') AS day,
       count(*) AS count
FROM wub_link AS l INDEXED BY link_user_created_idx
CROSS JOIN wub_click_event AS e INDEXED BY click_event_code_time_idx
WHERE l."userId" = ?1
  AND e.short_code = l.short_code
  AND e.recorded_at >= ?2
GROUP BY l.short_code, day
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

export async function loadUserClickCounts(
  database: ClickStatementDatabase,
  userId: string,
  since: Date,
) {
  const result = await database
    .prepare(USER_CLICK_COUNTS_SQL)
    .bind(userId, since.getTime())
    .all<{ short_code: string; day: string | null; count: number | string }>();
  return (result.results ?? []).flatMap((row) => {
    if (!row.day) return [];
    return [
      {
        short_code: row.short_code,
        day: row.day,
        count: Number(row.count) || 0,
      },
    ];
  });
}

function asMillis(value: number | string | null) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.abs(numeric) > 10_000_000_000 ? numeric : numeric * 1000;
}
