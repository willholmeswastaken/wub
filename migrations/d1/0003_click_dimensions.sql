-- Country, city, device, browser, OS, and referrer for the analytics page.
ALTER TABLE "wub_click_event" ADD COLUMN "country" text;
ALTER TABLE "wub_click_event" ADD COLUMN "city" text;
ALTER TABLE "wub_click_event" ADD COLUMN "device" text;
ALTER TABLE "wub_click_event" ADD COLUMN "browser" text;
ALTER TABLE "wub_click_event" ADD COLUMN "os" text;
ALTER TABLE "wub_click_event" ADD COLUMN "referrer" text;
CREATE INDEX IF NOT EXISTS "click_event_code_time_idx" ON "wub_click_event" ("short_code", "recorded_at");
