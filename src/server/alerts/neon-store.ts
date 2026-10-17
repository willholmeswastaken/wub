import {
  WAKE_QUIET_MS,
  type AlertRuleStatus,
  type AlertType,
} from "@/lib/alert-rules";
import { isUniqueViolation } from "@/server/db/conflicts";
import { sql, type SQL } from "drizzle-orm";

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

type Queryable = {
  execute: (query: SQL) => Promise<unknown>;
};

type RuleRow = {
  id: string;
  short_code: string;
  url: string;
  type: string;
  threshold: number | null;
  status: string;
  last_fired_at: Date | string | null;
  created_at: Date | string;
};

type FeedRow = {
  id: string;
  short_code: string;
  url: string | null;
  type: string;
  threshold: number | null;
  click_count: number;
  created_at: Date | string;
  read_at: Date | string | null;
};

type PendingRow = {
  alert_id: string;
  user_id: string;
  email: string | null;
  email_enabled: number | boolean;
  short_code: string;
  type: string;
  threshold: number | null;
  click_count: number;
};

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows: unknown }).rows;
    return Array.isArray(rows) ? (rows as T[]) : [];
  }
  return [];
}

function asDate(value: Date | string | number | null | undefined) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ruleStatus(status: string): AlertRuleStatus {
  if (status === "paused" || status === "fired") return status;
  return "active";
}

function alertType(type: string): AlertType {
  return type === "wakeup" ? "wakeup" : "milestone";
}

function ruleFrom(row: RuleRow): AlertRuleRecord {
  return {
    id: row.id,
    shortCode: row.short_code,
    url: row.url,
    type: alertType(row.type),
    threshold: row.threshold,
    status: ruleStatus(row.status),
    lastFiredAt: asDate(row.last_fired_at),
    createdAt: asDate(row.created_at) ?? new Date(),
  };
}

function pendingFrom(row: PendingRow): PendingAlertEmail {
  return {
    alertId: row.alert_id,
    userId: row.user_id,
    email: row.email ?? "",
    emailEnabled: row.email_enabled === true || Number(row.email_enabled) === 1,
    shortCode: row.short_code,
    type: alertType(row.type),
    threshold: row.threshold,
    clickCount: Number(row.click_count),
  };
}

const ruleSelect = sql`
  SELECT r.id, r.short_code, l.url, r.type, r.threshold, r.status, r.last_fired_at, r.created_at
  FROM wub_alert_rule r
  JOIN wub_link l ON l.short_code = r.short_code
`;

export async function evaluateClickAlertsOnNeon(
  database: Queryable,
  eventId: string,
  quietMs = WAKE_QUIET_MS,
): Promise<PendingAlertEmail[]> {
  const events = rowsOf<{ short_code: string }>(
    await database.execute(
      sql`SELECT short_code FROM wub_click WHERE event_id = ${eventId} LIMIT 1`,
    ),
  );
  const event = events[0];
  if (!event) return [];
  const code = event.short_code;

  await database.execute(sql`
    INSERT INTO wub_alert (
      id, rule_id, user_id, short_code, type, threshold, click_count, generation,
      source_event_id, email_state, created_at
    )
    SELECT
      gen_random_uuid()::text,
      r.id,
      r.user_id,
      r.short_code,
      'milestone',
      r.threshold,
      l.click_count,
      r.generation,
      c.event_id,
      'pending',
      c.timestamp
    FROM wub_alert_rule r
    JOIN wub_link l ON l.short_code = r.short_code
    JOIN wub_click c ON c.short_code = r.short_code AND c.event_id = ${eventId}
    WHERE r.type = 'milestone'
      AND r.status = 'active'
      AND r.short_code = ${code}
      AND l."userId" = r.user_id
      AND l.click_count >= r.threshold
    ON CONFLICT (rule_id, generation) DO NOTHING
  `);
  await database.execute(sql`
    UPDATE wub_alert_rule
    SET status = 'fired',
        last_fired_at = (SELECT timestamp FROM wub_click WHERE event_id = ${eventId}),
        updated_at = CURRENT_TIMESTAMP
    WHERE type = 'milestone'
      AND status = 'active'
      AND short_code = ${code}
      AND EXISTS (
        SELECT 1 FROM wub_alert a
        WHERE a.rule_id = wub_alert_rule.id
          AND a.source_event_id = ${eventId}
          AND a.generation = wub_alert_rule.generation
      )
  `);
  await database.execute(sql`
    INSERT INTO wub_alert (
      id, rule_id, user_id, short_code, type, threshold, click_count, generation,
      source_event_id, email_state, created_at
    )
    SELECT
      gen_random_uuid()::text,
      r.id,
      r.user_id,
      r.short_code,
      'wakeup',
      NULL,
      l.click_count,
      r.generation + 1,
      c.event_id,
      'pending',
      c.timestamp
    FROM wub_alert_rule r
    JOIN wub_link l ON l.short_code = r.short_code
    JOIN wub_click c ON c.short_code = r.short_code AND c.event_id = ${eventId}
    WHERE r.type = 'wakeup'
      AND r.status = 'active'
      AND r.short_code = ${code}
      AND l."userId" = r.user_id
      AND EXTRACT(EPOCH FROM (c.timestamp - COALESCE(c.previous_last_clicked, l.created_at))) * 1000 >= ${quietMs}
      AND (
        r.last_fired_at IS NULL
        OR r.last_fired_at <= COALESCE(c.previous_last_clicked, to_timestamp(0))
      )
    ON CONFLICT (rule_id, generation) DO NOTHING
  `);
  await database.execute(sql`
    UPDATE wub_alert_rule
    SET generation = generation + 1,
        last_fired_at = (SELECT timestamp FROM wub_click WHERE event_id = ${eventId}),
        updated_at = CURRENT_TIMESTAMP
    WHERE type = 'wakeup'
      AND status = 'active'
      AND short_code = ${code}
      AND EXISTS (
        SELECT 1 FROM wub_alert a
        WHERE a.rule_id = wub_alert_rule.id
          AND a.source_event_id = ${eventId}
          AND a.generation = wub_alert_rule.generation + 1
      )
  `);

  const pending = rowsOf<PendingRow>(
    await database.execute(sql`
      SELECT
        a.id AS alert_id,
        a.user_id,
        u.email,
        COALESCE(p.email_enabled, 1) AS email_enabled,
        a.short_code,
        a.type,
        a.threshold,
        a.click_count
      FROM wub_alert a
      JOIN wub_user u ON u.id = a.user_id
      LEFT JOIN wub_notification_pref p ON p.user_id = a.user_id
      WHERE a.source_event_id = ${eventId}
        AND a.email_state = 'pending'
    `),
  );
  return pending.map(pendingFrom);
}

export async function createAlertRuleOnNeon(
  database: Queryable,
  rule: NewAlertRule,
): Promise<CreateAlertRuleResult> {
  try {
    const inserted = rowsOf<{ id: string }>(
      await database.execute(sql`
        INSERT INTO wub_alert_rule (
          id, user_id, short_code, type, threshold, status, generation,
          last_fired_at, created_at, updated_at
        )
        SELECT ${rule.id}, l."userId", l.short_code, ${rule.type}, ${rule.threshold},
               'active', 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM wub_link l
        WHERE l.short_code = ${rule.shortCode} AND l."userId" = ${rule.userId}
        RETURNING id
      `),
    );
    if (inserted.length === 0) return { ok: false, reason: "not_found" };
  } catch (cause) {
    if (isUniqueViolation(cause)) return { ok: false, reason: "conflict" };
    throw cause;
  }
  const row = await findRule(database, rule.id, rule.userId);
  if (!row) return { ok: false, reason: "not_found" };
  return { ok: true, rule: row };
}

async function findRule(database: Queryable, id: string, userId: string) {
  const rows = rowsOf<RuleRow>(
    await database.execute(
      sql`${ruleSelect} WHERE r.id = ${id} AND r.user_id = ${userId}`,
    ),
  );
  const row = rows[0];
  return row ? ruleFrom(row) : null;
}

export async function listAlertRulesOnNeon(
  database: Queryable,
  userId: string,
) {
  const rows = rowsOf<RuleRow>(
    await database.execute(
      sql`${ruleSelect} WHERE r.user_id = ${userId} ORDER BY r.created_at DESC`,
    ),
  );
  return rows.map(ruleFrom);
}

async function mutateRule(
  database: Queryable,
  statement: SQL,
  id: string,
  userId: string,
) {
  const updated = rowsOf<{ id: string }>(await database.execute(statement));
  if (updated.length === 0) return null;
  return findRule(database, id, userId);
}

export function pauseAlertRuleOnNeon(
  database: Queryable,
  id: string,
  userId: string,
) {
  return mutateRule(
    database,
    sql`UPDATE wub_alert_rule
        SET status = 'paused', updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND user_id = ${userId} AND status = 'active'
        RETURNING id`,
    id,
    userId,
  );
}

export function resumeAlertRuleOnNeon(
  database: Queryable,
  id: string,
  userId: string,
) {
  return mutateRule(
    database,
    sql`UPDATE wub_alert_rule
        SET status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND user_id = ${userId} AND status = 'paused'
        RETURNING id`,
    id,
    userId,
  );
}

export function resetAlertRuleOnNeon(
  database: Queryable,
  id: string,
  userId: string,
) {
  return mutateRule(
    database,
    sql`UPDATE wub_alert_rule
        SET status = 'active',
            generation = generation + 1,
            last_fired_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND user_id = ${userId} AND type = 'milestone' AND status = 'fired'
        RETURNING id`,
    id,
    userId,
  );
}

export async function deleteAlertRuleOnNeon(
  database: Queryable,
  id: string,
  userId: string,
) {
  const deleted = rowsOf<{ id: string }>(
    await database.execute(
      sql`DELETE FROM wub_alert_rule WHERE id = ${id} AND user_id = ${userId} RETURNING id`,
    ),
  );
  return deleted.length > 0;
}

export async function listAlertsOnNeon(
  database: Queryable,
  userId: string,
): Promise<AlertFeedItem[]> {
  const rows = rowsOf<FeedRow>(
    await database.execute(sql`
      SELECT a.id, a.short_code, l.url, a.type, a.threshold, a.click_count, a.created_at, a.read_at
      FROM wub_alert a
      LEFT JOIN wub_link l ON l.short_code = a.short_code
      WHERE a.user_id = ${userId}
      ORDER BY a.created_at DESC
      LIMIT 100
    `),
  );
  return rows.map((row) => ({
    id: row.id,
    shortCode: row.short_code,
    url: row.url,
    type: alertType(row.type),
    threshold: row.threshold,
    clickCount: Number(row.click_count),
    createdAt: asDate(row.created_at) ?? new Date(),
    readAt: asDate(row.read_at),
  }));
}

export async function unreadAlertCountOnNeon(
  database: Queryable,
  userId: string,
) {
  const rows = rowsOf<{ count: number }>(
    await database.execute(
      sql`SELECT count(*)::int AS count FROM wub_alert WHERE user_id = ${userId} AND read_at IS NULL`,
    ),
  );
  return Number(rows[0]?.count ?? 0);
}

export async function markAlertReadOnNeon(
  database: Queryable,
  id: string,
  userId: string,
) {
  await database.execute(sql`
    UPDATE wub_alert SET read_at = CURRENT_TIMESTAMP
    WHERE id = ${id} AND user_id = ${userId} AND read_at IS NULL
  `);
}

export async function markAllAlertsReadOnNeon(
  database: Queryable,
  userId: string,
) {
  await database.execute(sql`
    UPDATE wub_alert SET read_at = CURRENT_TIMESTAMP
    WHERE user_id = ${userId} AND read_at IS NULL
  `);
}

export async function getEmailDeliveryOnNeon(
  database: Queryable,
  userId: string,
): Promise<EmailDelivery> {
  const rows = rowsOf<{
    email: string | null;
    email_enabled: number | boolean;
  }>(
    await database.execute(sql`
      SELECT u.email, COALESCE(p.email_enabled, 1) AS email_enabled
      FROM wub_user u
      LEFT JOIN wub_notification_pref p ON p.user_id = u.id
      WHERE u.id = ${userId}
    `),
  );
  const row = rows[0];
  return {
    email: row?.email ?? null,
    emailEnabled:
      row == null
        ? true
        : row.email_enabled === true || Number(row.email_enabled) === 1,
  };
}

export async function setEmailEnabledOnNeon(
  database: Queryable,
  userId: string,
  enabled: boolean,
): Promise<EmailDelivery> {
  const flag = enabled ? 1 : 0;
  await database.execute(sql`
    INSERT INTO wub_notification_pref (user_id, email_enabled) VALUES (${userId}, ${flag})
    ON CONFLICT (user_id) DO UPDATE SET email_enabled = ${flag}
  `);
  return getEmailDeliveryOnNeon(database, userId);
}

export async function claimAlertEmailOnNeon(
  database: Queryable,
  alertId: string,
): Promise<AlertEmailClaim | null> {
  const claimed = rowsOf<{ id: string }>(
    await database.execute(sql`
      UPDATE wub_alert SET email_state = 'sending'
      WHERE id = ${alertId} AND email_state = 'pending'
      RETURNING id
    `),
  );
  if (claimed.length === 0) return null;
  const rows = rowsOf<PendingRow>(
    await database.execute(sql`
      SELECT
        a.id AS alert_id,
        a.user_id,
        u.email,
        COALESCE(p.email_enabled, 1) AS email_enabled,
        a.short_code,
        a.type,
        a.threshold,
        a.click_count
      FROM wub_alert a
      JOIN wub_user u ON u.id = a.user_id
      LEFT JOIN wub_notification_pref p ON p.user_id = a.user_id
      WHERE a.id = ${alertId}
    `),
  );
  const row = rows[0];
  if (
    !row ||
    !(row.email_enabled === true || Number(row.email_enabled) === 1) ||
    !row.email
  ) {
    await settleAlertEmailOnNeon(database, alertId, "skipped");
    return null;
  }
  return pendingFrom(row);
}

export async function settleAlertEmailOnNeon(
  database: Queryable,
  alertId: string,
  state: AlertEmailState,
) {
  await database.execute(sql`
    UPDATE wub_alert
    SET email_state = ${state}
    WHERE id = ${alertId}
      AND (
        (${state} = 'pending' AND email_state = 'sending')
        OR (${state} = 'sent' AND email_state = 'sending')
        OR (${state} IN ('skipped', 'unconfigured') AND email_state IN ('pending', 'sending'))
      )
  `);
}

export async function deleteLinkAlertsOnNeon(
  database: Queryable,
  shortCode: string,
) {
  await database.execute(
    sql`DELETE FROM wub_alert WHERE short_code = ${shortCode}`,
  );
  await database.execute(
    sql`DELETE FROM wub_alert_rule WHERE short_code = ${shortCode}`,
  );
}
