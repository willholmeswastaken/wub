-- List links newest-first for one user. (userId, created_at) also serves every
-- userId lookup, so the single-column index would only add writes.
CREATE INDEX IF NOT EXISTS "link_user_created_idx" ON "wub_link" ("userId", "created_at");
DROP INDEX IF EXISTS "link_userId_idx";

-- Hourly purge. The userId index matches `userId IS NULL` and would read every
-- guest link; D1 bills each row that scan touches.
CREATE INDEX IF NOT EXISTS "link_guest_expiry_idx" ON "wub_link" ("expires_at") WHERE "userId" IS NULL AND "expires_at" IS NOT NULL;

-- Sign-in looks up users by email.
CREATE INDEX IF NOT EXISTS "user_email_idx" ON "wub_user" ("email");

-- (short_code, recorded_at) already covers short_code lookups and deletes.
-- The extra index is another row written on every click.
DROP INDEX IF EXISTS "click_event_short_code_idx";
