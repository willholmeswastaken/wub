import { WAKE_QUIET_MS } from "@/lib/alert-rules";
import { isUniqueViolation } from "@/server/db/conflicts";
import { type ClickStatementDatabase } from "@/server/db/record-click-sql";

import {
  type AlertEmailClaim,
  type AlertEmailState,
  type AlertFeedItem,
  type AlertRuleRecord,
  type CreateAlertRuleResult,
  type EmailDelivery,
  type NewAlertRule,
  type PendingAlertEmail,
} from "./types";

const MILESTONE_INSERT = `
INSERT INTO wub_alert (
  id, rule_id, user_id, short_code, type, threshold, click_count, generation,
  source_event_id, email_state, created_at
)
SELECT
  lower(hex(randomblob(16))),
  r.id,
  r.user_id,
  r.short_code,
  'milestone',
  r.threshold,
  l.click_count,
  r.generation,
  e.event_id,
  'pending',
  e.recorded_at
FROM wub_alert_rule r
JOIN wub_link l ON l.short_code = r.short_code
JOIN wub_click_event e ON e.short_code = r.short_code AND e.event_id = ?1
WHERE r.type = 'milestone'
  AND r.status = 'active'
  AND r.short_code = ?2
  AND l."userId" = r.user_id
  AND l.click_count >= r.threshold
ON CONFLICT (rule_id, generation) DO NOTHING
`;

const MILESTONE_FIRE = `
UPDATE wub_alert_rule
SET status = 'fired',
    last_fired_at = (SELECT recorded_at FROM wub_click_event WHERE event_id = ?1),
    updated_at = (SELECT recorded_at FROM wub_click_event WHERE event_id = ?1)
WHERE type = 'milestone'
  AND status = 'active'
  AND short_code = ?2
  AND EXISTS (
    SELECT 1 FROM wub_alert a
    WHERE a.rule_id = wub_alert_rule.id
      AND a.source_event_id = ?1
      AND a.generation = wub_alert_rule.generation
  )
`;

const WAKEUP_INSERT = `
INSERT INTO wub_alert (
  id, rule_id, user_id, short_code, type, threshold, click_count, generation,
  source_event_id, email_state, created_at
)
SELECT
  lower(hex(randomblob(16))),
  r.id,
  r.user_id,
  r.short_code,
  'wakeup',
  NULL,
  l.click_count,
  r.generation + 1,
  e.event_id,
  'pending',
  e.recorded_at
FROM wub_alert_rule r
JOIN wub_link l ON l.short_code = r.short_code
JOIN wub_click_event e ON e.short_code = r.short_code AND e.event_id = ?1
WHERE r.type = 'wakeup'
  AND r.status = 'active'
  AND r.short_code = ?2
  AND l."userId" = r.user_id
  AND (e.recorded_at - COALESCE(e.previous_last_clicked, l.created_at)) >= ?3
  AND (
    r.last_fired_at IS NULL
    OR r.last_fired_at <= COALESCE(e.previous_last_clicked, 0)
  )
ON CONFLICT (rule_id, generation) DO NOTHING
`;

const WAKEUP_FIRE = `
UPDATE wub_alert_rule
SET generation = generation + 1,
    last_fired_at = (SELECT recorded_at FROM wub_click_event WHERE event_id = ?1),
    updated_at = (SELECT recorded_at FROM wub_click_event WHERE event_id = ?1)
WHERE type = 'wakeup'
  AND status = 'active'
  AND short_code = ?2
  AND EXISTS (
    SELECT 1 FROM wub_alert a
    WHERE a.rule_id = wub_alert_rule.id
      AND a.source_event_id = ?1
      AND a.generation = wub_alert_rule.generation + 1
  )
`;

const PENDING_FOR_EVENT = `
SELECT
  a.id AS alert_id,
  a.user_id AS user_id,
  u.email AS email,
  COALESCE(p.email_enabled, 1) AS email_enabled,
  a.short_code AS short_code,
  a.type AS type,
  a.threshold AS threshold,
  a.click_count AS click_count
FROM wub_alert a
JOIN wub_user u ON u.id = a.user_id
LEFT JOIN wub_notification_pref p ON p.user_id = a.user_id
WHERE a.source_event_id = ?1
  AND a.email_state = 'pending'
`;

type RuleRow = {
  id: string;
  short_code: string;
  url: string;
  type: string;
  threshold: number | null;
  status: string;
  last_fired_at: number | null;
  created_at: number;
};

type FeedRow = {
  id: string;
  short_code: string;
  url: string | null;
  type: string;
  threshold: number | null;
  click_count: number;
  created_at: number;
  read_at: number | null;
};

type PendingRow = {
  alert_id: string;
  user_id: string;
  email: string | null;
  email_enabled: number;
  short_code: string;
  type: string;
  threshold: number | null;
  click_count: number;
};

function changesOf(result: { meta?: { changes?: number } } | undefined) {
  return result?.meta?.changes ?? 0;
}

function asDate(value: number | null) {
  return value == null ? null : new Date(value);
}

function ruleFrom(row: RuleRow): AlertRuleRecord {
  return {
    id: row.id,
    shortCode: row.short_code,
    url: row.url,
    type: row.type === "wakeup" ? "wakeup" : "milestone",
    threshold: row.threshold,
    status:
      row.status === "paused" || row.status === "fired" ? row.status : "active",
    lastFiredAt: asDate(row.last_fired_at),
    createdAt: new Date(row.created_at),
  };
}

function pendingFrom(row: PendingRow): PendingAlertEmail {
  return {
    alertId: row.alert_id,
    userId: row.user_id,
    email: row.email ?? "",
    emailEnabled: Number(row.email_enabled) === 1,
    shortCode: row.short_code,
    type: row.type === "wakeup" ? "wakeup" : "milestone",
    threshold: row.threshold,
    clickCount: row.click_count,
  };
}

const RULE_SELECT = `
SELECT r.id, r.short_code, l.url, r.type, r.threshold, r.status, r.last_fired_at, r.created_at
FROM wub_alert_rule r
JOIN wub_link l ON l.short_code = r.short_code
`;

export async function evaluateClickAlertsOnD1(
  database: ClickStatementDatabase,
  eventId: string,
  quietMs = WAKE_QUIET_MS,
): Promise<PendingAlertEmail[]> {
  const event = await database
    .prepare(`SELECT short_code FROM wub_click_event WHERE event_id = ?1`)
    .bind(eventId)
    .first<{ short_code: string }>();
  if (!event) return [];

  await database.batch([
    database.prepare(MILESTONE_INSERT).bind(eventId, event.short_code),
    database.prepare(MILESTONE_FIRE).bind(eventId, event.short_code),
    database.prepare(WAKEUP_INSERT).bind(eventId, event.short_code, quietMs),
    database.prepare(WAKEUP_FIRE).bind(eventId, event.short_code),
  ]);

  const pending = await database
    .prepare(PENDING_FOR_EVENT)
    .bind(eventId)
    .all<PendingRow>();
  return (pending.results ?? []).map(pendingFrom);
}

export async function createAlertRuleOnD1(
  database: ClickStatementDatabase,
  rule: NewAlertRule,
  now = Date.now(),
): Promise<CreateAlertRuleResult> {
  try {
    const inserted = await database
      .prepare(
        `INSERT INTO wub_alert_rule (
           id, user_id, short_code, type, threshold, status, generation,
           last_fired_at, created_at, updated_at
         )
         SELECT ?1, l."userId", l.short_code, ?2, ?3, 'active', 0, NULL, ?4, ?4
         FROM wub_link l
         WHERE l.short_code = ?5 AND l."userId" = ?6`,
      )
      .bind(
        rule.id,
        rule.type,
        rule.threshold,
        now,
        rule.shortCode,
        rule.userId,
      )
      .run();
    if (changesOf(inserted) === 0) return { ok: false, reason: "not_found" };
  } catch (cause) {
    if (isUniqueViolation(cause)) return { ok: false, reason: "conflict" };
    throw cause;
  }

  const row = await database
    .prepare(`${RULE_SELECT} WHERE r.id = ?1 AND r.user_id = ?2`)
    .bind(rule.id, rule.userId)
    .first<RuleRow>();
  if (!row) return { ok: false, reason: "not_found" };
  return { ok: true, rule: ruleFrom(row) };
}

export async function listAlertRulesOnD1(
  database: ClickStatementDatabase,
  userId: string,
) {
  const rows = await database
    .prepare(`${RULE_SELECT} WHERE r.user_id = ?1 ORDER BY r.created_at DESC`)
    .bind(userId)
    .all<RuleRow>();
  return (rows.results ?? []).map(ruleFrom);
}

async function updateRule(
  database: ClickStatementDatabase,
  sql: string,
  id: string,
  userId: string,
  now = Date.now(),
) {
  const updated = await database.prepare(sql).bind(now, id, userId).run();
  if (changesOf(updated) === 0) return null;
  const row = await database
    .prepare(`${RULE_SELECT} WHERE r.id = ?1 AND r.user_id = ?2`)
    .bind(id, userId)
    .first<RuleRow>();
  return row ? ruleFrom(row) : null;
}

export function pauseAlertRuleOnD1(
  database: ClickStatementDatabase,
  id: string,
  userId: string,
  now = Date.now(),
) {
  return updateRule(
    database,
    `UPDATE wub_alert_rule
     SET status = 'paused', updated_at = ?1
     WHERE id = ?2 AND user_id = ?3 AND status = 'active'`,
    id,
    userId,
    now,
  );
}

export function resumeAlertRuleOnD1(
  database: ClickStatementDatabase,
  id: string,
  userId: string,
  now = Date.now(),
) {
  return updateRule(
    database,
    `UPDATE wub_alert_rule
     SET status = 'active', updated_at = ?1
     WHERE id = ?2 AND user_id = ?3 AND status = 'paused'`,
    id,
    userId,
    now,
  );
}

export function resetAlertRuleOnD1(
  database: ClickStatementDatabase,
  id: string,
  userId: string,
  now = Date.now(),
) {
  return updateRule(
    database,
    `UPDATE wub_alert_rule
     SET status = 'active',
         generation = generation + 1,
         last_fired_at = NULL,
         updated_at = ?1
     WHERE id = ?2 AND user_id = ?3 AND type = 'milestone' AND status = 'fired'`,
    id,
    userId,
    now,
  );
}

export async function deleteAlertRuleOnD1(
  database: ClickStatementDatabase,
  id: string,
  userId: string,
) {
  const deleted = await database
    .prepare(`DELETE FROM wub_alert_rule WHERE id = ?1 AND user_id = ?2`)
    .bind(id, userId)
    .run();
  return changesOf(deleted) > 0;
}

export async function listAlertsOnD1(
  database: ClickStatementDatabase,
  userId: string,
): Promise<AlertFeedItem[]> {
  const rows = await database
    .prepare(
      `SELECT a.id, a.short_code, l.url, a.type, a.threshold, a.click_count, a.created_at, a.read_at
       FROM wub_alert a
       LEFT JOIN wub_link l ON l.short_code = a.short_code
       WHERE a.user_id = ?1
       ORDER BY a.created_at DESC
       LIMIT 100`,
    )
    .bind(userId)
    .all<FeedRow>();
  return (rows.results ?? []).map((row) => ({
    id: row.id,
    shortCode: row.short_code,
    url: row.url,
    type: row.type === "wakeup" ? "wakeup" : "milestone",
    threshold: row.threshold,
    clickCount: row.click_count,
    createdAt: new Date(row.created_at),
    readAt: asDate(row.read_at),
  }));
}

export async function unreadAlertCountOnD1(
  database: ClickStatementDatabase,
  userId: string,
) {
  const row = await database
    .prepare(
      `SELECT count(*) AS count FROM wub_alert WHERE user_id = ?1 AND read_at IS NULL`,
    )
    .bind(userId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function markAlertReadOnD1(
  database: ClickStatementDatabase,
  id: string,
  userId: string,
  now = Date.now(),
) {
  await database
    .prepare(
      `UPDATE wub_alert SET read_at = ?1 WHERE id = ?2 AND user_id = ?3 AND read_at IS NULL`,
    )
    .bind(now, id, userId)
    .run();
}

export async function markAllAlertsReadOnD1(
  database: ClickStatementDatabase,
  userId: string,
  now = Date.now(),
) {
  await database
    .prepare(
      `UPDATE wub_alert SET read_at = ?1 WHERE user_id = ?2 AND read_at IS NULL`,
    )
    .bind(now, userId)
    .run();
}

export async function getEmailDeliveryOnD1(
  database: ClickStatementDatabase,
  userId: string,
): Promise<EmailDelivery> {
  const row = await database
    .prepare(
      `SELECT u.email AS email, COALESCE(p.email_enabled, 1) AS email_enabled
       FROM wub_user u
       LEFT JOIN wub_notification_pref p ON p.user_id = u.id
       WHERE u.id = ?1`,
    )
    .bind(userId)
    .first<{ email: string | null; email_enabled: number }>();
  return {
    email: row?.email ?? null,
    emailEnabled: row == null ? true : Number(row.email_enabled) === 1,
  };
}

export async function setEmailEnabledOnD1(
  database: ClickStatementDatabase,
  userId: string,
  enabled: boolean,
): Promise<EmailDelivery> {
  await database
    .prepare(
      `INSERT INTO wub_notification_pref (user_id, email_enabled) VALUES (?1, ?2)
       ON CONFLICT (user_id) DO UPDATE SET email_enabled = ?2`,
    )
    .bind(userId, enabled ? 1 : 0)
    .run();
  return getEmailDeliveryOnD1(database, userId);
}

const CLAIM_SELECT = `
SELECT
  a.id AS alert_id,
  a.user_id AS user_id,
  u.email AS email,
  COALESCE(p.email_enabled, 1) AS email_enabled,
  a.short_code AS short_code,
  a.type AS type,
  a.threshold AS threshold,
  a.click_count AS click_count
FROM wub_alert a
JOIN wub_user u ON u.id = a.user_id
LEFT JOIN wub_notification_pref p ON p.user_id = a.user_id
WHERE a.id = ?1
`;

export async function claimAlertEmailOnD1(
  database: ClickStatementDatabase,
  alertId: string,
): Promise<AlertEmailClaim | null> {
  const claimed = await database
    .prepare(
      `UPDATE wub_alert SET email_state = 'sending' WHERE id = ?1 AND email_state = 'pending'`,
    )
    .bind(alertId)
    .run();
  if (changesOf(claimed) === 0) return null;

  const row = await database
    .prepare(CLAIM_SELECT)
    .bind(alertId)
    .first<PendingRow>();
  if (!row || Number(row.email_enabled) !== 1 || !row.email) {
    await settleAlertEmailOnD1(database, alertId, "skipped");
    return null;
  }
  return pendingFrom(row);
}

export async function settleAlertEmailOnD1(
  database: ClickStatementDatabase,
  alertId: string,
  state: AlertEmailState,
) {
  await database
    .prepare(
      `UPDATE wub_alert
       SET email_state = ?2
       WHERE id = ?1
         AND (
           (?2 = 'pending' AND email_state = 'sending')
           OR (?2 = 'sent' AND email_state = 'sending')
           OR (?2 IN ('skipped', 'unconfigured') AND email_state IN ('pending', 'sending'))
         )`,
    )
    .bind(alertId, state)
    .run();
}

export async function deleteLinkAlertsOnD1(
  database: ClickStatementDatabase,
  shortCode: string,
) {
  await database.batch([
    database
      .prepare(`DELETE FROM wub_alert WHERE short_code = ?1`)
      .bind(shortCode),
    database
      .prepare(`DELETE FROM wub_alert_rule WHERE short_code = ?1`)
      .bind(shortCode),
  ]);
}
