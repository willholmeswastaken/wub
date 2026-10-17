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

export const links = createTable(
  "link",
  {
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
  },
  (link) => ({
    userIdIdx: index("link_userId_idx").on(link.userId),
  }),
);

export const clickEvents = createTable(
  "click_event",
  {
    event_id: text("event_id").primaryKey(),
    short_code: text("short_code").notNull(),
    recorded_at: integer("recorded_at", { mode: "timestamp_ms" }).notNull(),
    country: text("country"),
    city: text("city"),
    device: text("device"),
    browser: text("browser"),
    os: text("os"),
    referrer: text("referrer"),
    previous_last_clicked: integer("previous_last_clicked", {
      mode: "timestamp_ms",
    }),
  },
  (event) => ({
    shortCodeIdx: index("click_event_short_code_idx").on(event.short_code),
    shortCodeTimeIdx: index("click_event_code_time_idx").on(
      event.short_code,
      event.recorded_at,
    ),
  }),
);

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
    referrer: text("referrer"),
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

export const alertRules = createTable(
  "alert_rule",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    short_code: text("short_code").notNull(),
    type: text("type").notNull(),
    threshold: integer("threshold"),
    status: text("status").notNull().default("active"),
    generation: integer("generation").notNull().default(0),
    last_fired_at: integer("last_fired_at", { mode: "timestamp_ms" }),
    created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updated_at: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (rule) => ({
    linkIdx: index("alert_rule_link_idx").on(rule.short_code, rule.status),
    userIdx: index("alert_rule_user_idx").on(rule.userId),
  }),
);

export const alerts = createTable(
  "alert",
  {
    id: text("id").primaryKey(),
    ruleId: text("rule_id").notNull(),
    userId: text("user_id").notNull(),
    short_code: text("short_code").notNull(),
    type: text("type").notNull(),
    threshold: integer("threshold"),
    click_count: integer("click_count").notNull(),
    generation: integer("generation").notNull(),
    source_event_id: text("source_event_id"),
    email_state: text("email_state").notNull().default("pending"),
    created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    read_at: integer("read_at", { mode: "timestamp_ms" }),
  },
  (alert) => ({
    userCreatedIdx: index("alert_user_created_idx").on(
      alert.userId,
      alert.created_at,
    ),
    eventIdx: index("alert_event_idx").on(alert.source_event_id),
  }),
);

export const notificationPrefs = createTable("notification_pref", {
  userId: text("user_id").primaryKey(),
  emailEnabled: integer("email_enabled").notNull().default(1),
});

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
