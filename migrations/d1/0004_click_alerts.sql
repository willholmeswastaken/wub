-- Click alerts: rules indexed by link, one row per fired alert, email preference.
-- previous_last_clicked is the link's last_clicked at the moment this event was stored,
-- so wake-up evaluation stays correct when the queue retries a click.
ALTER TABLE "wub_click_event" ADD COLUMN "previous_last_clicked" integer;

CREATE TABLE IF NOT EXISTS "wub_alert_rule" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "short_code" text NOT NULL,
  "type" text NOT NULL,
  "threshold" integer,
  "status" text NOT NULL DEFAULT 'active',
  "generation" integer NOT NULL DEFAULT 0,
  "last_fired_at" integer,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL
);

CREATE INDEX IF NOT EXISTS "alert_rule_link_idx" ON "wub_alert_rule" ("short_code", "status");
CREATE INDEX IF NOT EXISTS "alert_rule_user_idx" ON "wub_alert_rule" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "alert_rule_wakeup_idx" ON "wub_alert_rule" ("short_code") WHERE "type" = 'wakeup';
CREATE UNIQUE INDEX IF NOT EXISTS "alert_rule_milestone_idx" ON "wub_alert_rule" ("short_code", "threshold") WHERE "type" = 'milestone';

CREATE TABLE IF NOT EXISTS "wub_alert" (
  "id" text PRIMARY KEY NOT NULL,
  "rule_id" text NOT NULL,
  "user_id" text NOT NULL,
  "short_code" text NOT NULL,
  "type" text NOT NULL,
  "threshold" integer,
  "click_count" integer NOT NULL,
  "generation" integer NOT NULL,
  "source_event_id" text,
  "email_state" text NOT NULL DEFAULT 'pending',
  "created_at" integer NOT NULL,
  "read_at" integer
);

CREATE UNIQUE INDEX IF NOT EXISTS "alert_rule_generation_idx" ON "wub_alert" ("rule_id", "generation");
CREATE INDEX IF NOT EXISTS "alert_user_created_idx" ON "wub_alert" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "alert_event_idx" ON "wub_alert" ("source_event_id");
CREATE INDEX IF NOT EXISTS "alert_user_unread_idx" ON "wub_alert" ("user_id") WHERE "read_at" IS NULL;

CREATE TABLE IF NOT EXISTS "wub_notification_pref" (
  "user_id" text PRIMARY KEY NOT NULL,
  "email_enabled" integer NOT NULL DEFAULT 1
);
