-- Neon compatibility migration. The Worker uses D1 migrations in migrations/d1.
CREATE INDEX IF NOT EXISTS "link_userId_idx" ON "wub_link" ("userId");
ALTER TABLE "wub_click" ADD COLUMN IF NOT EXISTS "event_id" varchar(64);
CREATE UNIQUE INDEX IF NOT EXISTS "click_event_id_idx" ON "wub_click" ("event_id");
CREATE INDEX IF NOT EXISTS "click_short_code_timestamp_idx" ON "wub_click" ("short_code", "timestamp");
