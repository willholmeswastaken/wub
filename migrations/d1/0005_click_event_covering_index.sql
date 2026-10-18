-- Analytics aggregates click events in SQL. Dashboard sparklines read
-- (short_code, recorded_at). One covering index serves both.
--
-- The replacement is created before the narrower indexes are dropped, so a
-- failed CREATE leaves click_event_short_code_idx and click_event_code_time_idx
-- in place. Re-running is safe: the covering index is IF NOT EXISTS and the
-- drops are IF EXISTS.
--
-- Ordering: 0003 creates the dimension columns and the narrow
-- click_event_code_time_idx. 0004_read_paths.sql drops
-- click_event_short_code_idx and adds the link and user indexes; it does not
-- read this index. Deploy applies migrations/d1 in filename order, so this
-- file runs after 0004. Click lookups by event_id (including a later alerts
-- migration that adds previous_last_clicked) use the primary key, so they do
-- not depend on either index this file drops.
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
