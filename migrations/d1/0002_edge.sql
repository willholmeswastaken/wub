-- Applied by scripts/deploy.js before the Worker is deployed. Request handlers do not run this SQL.
CREATE INDEX IF NOT EXISTS "link_userId_idx" ON "wub_link" ("userId");
CREATE TABLE IF NOT EXISTS "wub_click_event" (
  "event_id" text PRIMARY KEY NOT NULL,
  "short_code" text NOT NULL,
  "recorded_at" integer NOT NULL
);
CREATE INDEX IF NOT EXISTS "click_event_short_code_idx" ON "wub_click_event" ("short_code");
