import { CLICK_EVENT_RANGE_INDEX } from "./schema-sql";

const INSERT_CLICK_EVENT_SQL = `
INSERT INTO wub_click_event (
  event_id, short_code, recorded_at, country, city, device, browser, os, referrer
)
SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9
WHERE EXISTS (SELECT 1 FROM wub_link WHERE short_code = ?2)
ON CONFLICT (event_id) DO NOTHING
`;

const INCREMENT_LINK_SQL = `
UPDATE wub_link
SET click_count = click_count + 1,
    last_clicked = ?2
WHERE short_code = ?1
  AND changes() = 1
`;

type StatementResult = {
  meta?: { changes?: number; rows_read?: number };
};

type BoundStatement = {
  run(): Promise<StatementResult>;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<StatementResult & { results?: T[] }>;
};

type Statement = {
  bind(...values: unknown[]): BoundStatement;
};

export type ClickStatementDatabase = {
  prepare(query: string): Statement;
  batch(statements: BoundStatement[]): Promise<StatementResult[]>;
};

// Guest links expire after 30 minutes, so an hour of them is a small set. Stay
// under D1's 100 bound parameters and under the 30s query limit by deleting
// links and their clicks in bounded batches.
const PURGE_LINK_BATCH = 40;
const PURGE_CLICK_BATCH = 500;
const MAX_PURGE_ROUNDS = 12;
const MAX_CLICK_ROUNDS = 20;

// INDEXED BY is load-bearing. (userId, created_at) also matches `userId IS NULL`,
// and without stats the planner reads every guest link. D1 bills those rows.
export const SELECT_EXPIRED_GUEST_LINKS_SQL = `
SELECT short_code
FROM wub_link INDEXED BY link_guest_expiry_idx
WHERE "userId" IS NULL
  AND expires_at IS NOT NULL
  AND expires_at <= ?1
LIMIT ${PURGE_LINK_BATCH}
`;

export const DELETE_GUEST_EVENTS_SQL = `
DELETE FROM wub_click_event
WHERE rowid IN (
  SELECT rowid
  FROM wub_click_event INDEXED BY ${CLICK_EVENT_RANGE_INDEX}
  WHERE short_code = ?1
  LIMIT ${PURGE_CLICK_BATCH}
)
AND EXISTS (
  SELECT 1 FROM wub_link
  WHERE short_code = ?1
    AND "userId" IS NULL
    AND expires_at IS NOT NULL
    AND expires_at <= ?2
)
`;

const DELETE_GUEST_CLICKS_SQL = `
DELETE FROM wub_click
WHERE rowid IN (
  SELECT rowid
  FROM wub_click INDEXED BY click_short_code_idx
  WHERE short_code = ?1
  LIMIT ${PURGE_CLICK_BATCH}
)
AND EXISTS (
  SELECT 1 FROM wub_link
  WHERE short_code = ?1
    AND "userId" IS NULL
    AND expires_at IS NOT NULL
    AND expires_at <= ?2
)
`;

const DELETE_GUEST_LINK_SQL = `
DELETE FROM wub_link
WHERE short_code = ?1
  AND "userId" IS NULL
  AND expires_at IS NOT NULL
  AND expires_at <= ?2
`;

export const DELETE_CODE_EVENTS_SQL = `
DELETE FROM wub_click_event
WHERE rowid IN (
  SELECT rowid
  FROM wub_click_event INDEXED BY ${CLICK_EVENT_RANGE_INDEX}
  WHERE short_code = ?1
  LIMIT ${PURGE_CLICK_BATCH}
)
`;

const DELETE_CODE_CLICKS_SQL = `
DELETE FROM wub_click
WHERE rowid IN (
  SELECT rowid
  FROM wub_click INDEXED BY click_short_code_idx
  WHERE short_code = ?1
  LIMIT ${PURGE_CLICK_BATCH}
)
`;

export type RecordClickResult = "recorded" | "duplicate" | "not_found";

export async function recordClickOnD1(
  database: ClickStatementDatabase,
  event: {
    event_id: string;
    short_code: string;
    country?: string | null;
    city?: string | null;
    device?: string | null;
    browser?: string | null;
    os?: string | null;
    referrer?: string | null;
  },
  now = Date.now(),
): Promise<RecordClickResult> {
  const [updated] = (
    await database.batch([
      database
        .prepare(INSERT_CLICK_EVENT_SQL)
        .bind(
          event.event_id,
          event.short_code,
          now,
          event.country ?? null,
          event.city ?? null,
          event.device ?? null,
          event.browser ?? null,
          event.os ?? null,
          event.referrer ?? "direct",
        ),
      database.prepare(INCREMENT_LINK_SQL).bind(event.short_code, now),
    ])
  ).slice(1);
  if ((updated?.meta?.changes ?? 0) > 0) return "recorded";

  const link = await database
    .prepare(`SELECT 1 AS ok FROM wub_link WHERE short_code = ?1`)
    .bind(event.short_code)
    .first();
  return link ? "duplicate" : "not_found";
}

export async function deleteStoredClicks(
  database: ClickStatementDatabase,
  code: string,
) {
  for (let round = 0; round < MAX_CLICK_ROUNDS; round += 1) {
    const [events, clicks] = await database.batch([
      database.prepare(DELETE_CODE_EVENTS_SQL).bind(code),
      database.prepare(DELETE_CODE_CLICKS_SQL).bind(code),
    ]);
    const eventChanges = events?.meta?.changes ?? 0;
    const clickChanges = clicks?.meta?.changes ?? 0;
    if (eventChanges < PURGE_CLICK_BATCH && clickChanges < PURGE_CLICK_BATCH) {
      return;
    }
  }
}

export async function deleteExpiredGuestLinksOnD1(
  database: ClickStatementDatabase,
  now = Date.now(),
) {
  const removed: string[] = [];
  for (let round = 0; round < MAX_PURGE_ROUNDS; round += 1) {
    const selected = await database
      .prepare(SELECT_EXPIRED_GUEST_LINKS_SQL)
      .bind(now)
      .all<{ short_code: string }>();
    const codes = (selected.results ?? []).map((row) => row.short_code);
    if (codes.length === 0) break;

    const finished = await drainGuestClicks(database, codes, now);
    removed.push(...(await deleteGuestLinks(database, finished, now)));
    if (codes.length < PURGE_LINK_BATCH) break;
  }
  return removed;
}

async function drainGuestClicks(
  database: ClickStatementDatabase,
  codes: readonly string[],
  now: number,
) {
  let pending = [...codes];
  for (
    let round = 0;
    round < MAX_CLICK_ROUNDS && pending.length > 0;
    round += 1
  ) {
    const drained = await database.batch(
      pending.flatMap((code) => [
        database.prepare(DELETE_GUEST_EVENTS_SQL).bind(code, now),
        database.prepare(DELETE_GUEST_CLICKS_SQL).bind(code, now),
      ]),
    );
    pending = pending.filter((_, index) => {
      const events = drained[index * 2]?.meta?.changes ?? 0;
      const clicks = drained[index * 2 + 1]?.meta?.changes ?? 0;
      return events >= PURGE_CLICK_BATCH || clicks >= PURGE_CLICK_BATCH;
    });
  }
  const unfinished = new Set(pending);
  return codes.filter((code) => !unfinished.has(code));
}

async function deleteGuestLinks(
  database: ClickStatementDatabase,
  codes: readonly string[],
  now: number,
) {
  if (codes.length === 0) return [];
  const deleted = await database.batch(
    codes.flatMap((code) => [
      database.prepare(DELETE_GUEST_EVENTS_SQL).bind(code, now),
      database.prepare(DELETE_GUEST_CLICKS_SQL).bind(code, now),
      database.prepare(DELETE_GUEST_LINK_SQL).bind(code, now),
    ]),
  );
  const removed: string[] = [];
  for (let index = 0; index < codes.length; index += 1) {
    const code = codes[index];
    if (code && (deleted[index * 3 + 2]?.meta?.changes ?? 0) > 0) {
      removed.push(code);
    }
  }
  return removed;
}
