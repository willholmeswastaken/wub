import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTableCreator,
  text,
} from "drizzle-orm/sqlite-core";
import { type AdapterAccount } from "next-auth/adapters";

const createTable = sqliteTableCreator((name) => `wub_${name}`);

const now = sql`(unixepoch() * 1000)`;

export const links = createTable("link", {
  short_code: text("short_code").notNull().primaryKey(),
  url: text("url").notNull(),
  title: text("title"),
  userId: text("userId").references(() => users.id),
  created_at: integer("created_at", { mode: "timestamp_ms" })
    .default(now)
    .notNull(),
  click_count: integer("click_count").notNull().default(0),
  last_clicked: integer("last_clicked", { mode: "timestamp_ms" }),
  expires_at: integer("expires_at", { mode: "timestamp_ms" }),
  claim_token: text("claim_token"),
});

export const linksRelations = relations(links, ({ many }) => ({
  clicks: many(clicks),
}));

export const clicks = createTable(
  "click",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    short_code: text("short_code").notNull(),
    timestamp: integer("timestamp", { mode: "timestamp_ms" }).default(now),
    userAgent: text("userAgent"),
    ipAddress: text("ipAddress"),
    country: text("country"),
    city: text("city"),
    region: text("region"),
    latitude: text("latitude"),
    longitude: text("longitude"),
    device: text("device"),
    device_vendor: text("device_vendor"),
    device_model: text("device_model"),
    browser: text("browser"),
    browser_version: text("browser_version"),
    engine: text("engine"),
    engine_version: text("engine_version"),
    os: text("os"),
    os_version: text("os_version"),
    cpu_architecture: text("cpu_architecture"),
  },
  (click) => ({
    shortCodeIdx: index("click_short_code_idx").on(click.short_code),
  }),
);

export const users = createTable("user", {
  id: text("id").notNull().primaryKey(),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  links: many(links),
}));

export const accounts = createTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    refresh_token_expires_in: integer("refresh_token_expires_in"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    userIdIdx: index("account_userId_idx").on(account.userId),
  }),
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "session",
  {
    sessionToken: text("sessionToken").notNull().primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (session) => ({
    userIdIdx: index("session_userId_idx").on(session.userId),
  }),
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);
