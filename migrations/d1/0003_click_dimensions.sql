-- Click stats are read from D1. Analytics Engine samples adaptively and can
-- return a full result on one request and an empty result on the next.
ALTER TABLE "wub_click_event" ADD COLUMN "country" text;
ALTER TABLE "wub_click_event" ADD COLUMN "city" text;
ALTER TABLE "wub_click_event" ADD COLUMN "device" text;
ALTER TABLE "wub_click_event" ADD COLUMN "browser" text;
ALTER TABLE "wub_click_event" ADD COLUMN "os" text;
ALTER TABLE "wub_click_event" ADD COLUMN "referrer" text;
CREATE INDEX IF NOT EXISTS "click_event_code_time_idx" ON "wub_click_event" ("short_code", "recorded_at");
