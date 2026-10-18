-- Analytics aggregates click events in SQL. Dashboard sparklines read
-- (short_code, recorded_at). One covering index serves both.
--
-- The replacement is created before the narrower indexes are dropped, so a
-- failed CREATE leaves click_event_short_code_idx and click_event_code_time_idx
-- in place. Re-running is safe: the covering index is IF NOT EXISTS and the
-- drops are IF EXISTS.
--
-- Ordering: PR #87 adds migrations/d1/0004_click_alerts.sql (alert tables and
-- previous_last_clicked on wub_click_event). This file does not read that
-- column, so 0004 and 0005 can apply in either order. 0003 must run first so
-- the dimension columns exist; deploy applies migrations/d1 in filename order.
CREATE INDEX IF NOT EXISTS "click_event_covering_idx" ON "wub_click_event" (
  "short_code",
  "recorded_at",
  "country",
  "city",
  "device",
  "browser",
  "os",
  "referrer"
);
DROP INDEX IF EXISTS "click_event_short_code_idx";
DROP INDEX IF EXISTS "click_event_code_time_idx";
