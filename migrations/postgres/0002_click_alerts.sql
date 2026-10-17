-- Neon/Postgres counterpart of migrations/d1/0004_click_alerts.sql.
-- Production Workers use D1. This keeps the Neon fallback schema in step.
ALTER TABLE "wub_click" ADD COLUMN IF NOT EXISTS "previous_last_clicked" timestamp;

CREATE TABLE IF NOT EXISTS "wub_alert_rule" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "user_id" varchar(255) NOT NULL REFERENCES "wub_user"("id"),
  "short_code" varchar(32) NOT NULL,
  "type" text NOT NULL,
  "threshold" integer,
  "status" text NOT NULL DEFAULT 'active',
  "generation" integer NOT NULL DEFAULT 0,
  "last_fired_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "alert_rule_link_idx" ON "wub_alert_rule" ("short_code", "status");
CREATE INDEX IF NOT EXISTS "alert_rule_user_idx" ON "wub_alert_rule" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "alert_rule_wakeup_idx" ON "wub_alert_rule" ("short_code") WHERE "type" = 'wakeup';
CREATE UNIQUE INDEX IF NOT EXISTS "alert_rule_milestone_idx" ON "wub_alert_rule" ("short_code", "threshold") WHERE "type" = 'milestone';

CREATE TABLE IF NOT EXISTS "wub_alert" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "rule_id" varchar(64) NOT NULL,
  "user_id" varchar(255) NOT NULL,
  "short_code" varchar(32) NOT NULL,
  "type" text NOT NULL,
  "threshold" integer,
  "click_count" integer NOT NULL,
  "generation" integer NOT NULL,
  "source_event_id" varchar(64),
  "email_state" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "read_at" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "alert_rule_generation_idx" ON "wub_alert" ("rule_id", "generation");
CREATE INDEX IF NOT EXISTS "alert_user_created_idx" ON "wub_alert" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "alert_event_idx" ON "wub_alert" ("source_event_id");
CREATE INDEX IF NOT EXISTS "alert_user_unread_idx" ON "wub_alert" ("user_id") WHERE "read_at" IS NULL;

CREATE TABLE IF NOT EXISTS "wub_notification_pref" (
  "user_id" varchar(255) PRIMARY KEY NOT NULL REFERENCES "wub_user"("id"),
  "email_enabled" integer NOT NULL DEFAULT 1
);
