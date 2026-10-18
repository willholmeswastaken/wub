-- Analytics aggregates click events in SQL. Dashboard sparklines read
-- (short_code, recorded_at) stamps. One index on
-- (short_code, recorded_at, dimensions) covers both, so the narrower
-- indexes are dropped.
--
-- Ordering: PR #87 adds migrations/d1/0004_click_alerts.sql. This file is 0005
-- so it applies after that migration. It does not touch the alert tables, and
-- it can also apply on main before 0004 exists.
DROP INDEX IF EXISTS "click_event_short_code_idx";
DROP INDEX IF EXISTS "click_event_code_time_idx";
CREATE INDEX IF NOT EXISTS "click_event_code_time_idx" ON "wub_click_event" (
  "short_code",
  "recorded_at",
  "country",
  "city",
  "device",
  "browser",
  "os",
  "referrer"
);
