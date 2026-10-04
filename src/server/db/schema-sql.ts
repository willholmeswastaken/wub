export const D1_BOOTSTRAP_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "wub_user" ("id" text PRIMARY KEY NOT NULL, "name" text, "email" text NOT NULL, "emailVerified" integer, "image" text)`,
  `CREATE TABLE IF NOT EXISTS "wub_account" ("userId" text NOT NULL, "type" text NOT NULL, "provider" text NOT NULL, "providerAccountId" text NOT NULL, "refresh_token" text, "refresh_token_expires_in" integer, "access_token" text, "expires_at" integer, "token_type" text, "scope" text, "id_token" text, "session_state" text, PRIMARY KEY ("provider", "providerAccountId"), FOREIGN KEY ("userId") REFERENCES "wub_user"("id") ON DELETE cascade)`,
  `CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "wub_account" ("userId")`,
  `CREATE TABLE IF NOT EXISTS "wub_session" ("sessionToken" text PRIMARY KEY NOT NULL, "userId" text NOT NULL, "expires" integer NOT NULL, FOREIGN KEY ("userId") REFERENCES "wub_user"("id") ON DELETE cascade)`,
  `CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "wub_session" ("userId")`,
  `CREATE TABLE IF NOT EXISTS "wub_verificationToken" ("identifier" text NOT NULL, "token" text NOT NULL, "expires" integer NOT NULL, PRIMARY KEY ("identifier", "token"))`,
  `CREATE TABLE IF NOT EXISTS "wub_link" ("short_code" text PRIMARY KEY NOT NULL, "url" text NOT NULL, "title" text, "userId" text, "created_at" integer DEFAULT (unixepoch() * 1000) NOT NULL, "click_count" integer DEFAULT 0 NOT NULL, "last_clicked" integer, "expires_at" integer, "claim_token" text, FOREIGN KEY ("userId") REFERENCES "wub_user"("id"))`,
  `CREATE TABLE IF NOT EXISTS "wub_click" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "short_code" text NOT NULL, "timestamp" integer DEFAULT (unixepoch() * 1000), "userAgent" text, "ipAddress" text, "country" text, "city" text, "region" text, "latitude" text, "longitude" text, "device" text, "device_vendor" text, "device_model" text, "browser" text, "browser_version" text, "engine" text, "engine_version" text, "os" text, "os_version" text, "cpu_architecture" text, "referrer" text)`,
  `CREATE INDEX IF NOT EXISTS "click_short_code_idx" ON "wub_click" ("short_code")`,
];

// CREATE TABLE IF NOT EXISTS does not add columns to a database that already
// exists, so these run after the bootstrap and ignore "duplicate column".
export const D1_ADDED_COLUMNS = [
  `ALTER TABLE "wub_link" ADD COLUMN "claim_token" text`,
  `ALTER TABLE "wub_click" ADD COLUMN "referrer" text`,
];

export async function applyD1Schema(exec: (query: string) => Promise<unknown>) {
  for (const statement of D1_BOOTSTRAP_STATEMENTS) {
    await exec(statement);
  }
  for (const statement of D1_ADDED_COLUMNS) {
    try {
      await exec(statement);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      if (!/duplicate column/i.test(message)) throw cause;
    }
  }
}
