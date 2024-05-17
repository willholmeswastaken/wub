import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTableCreator,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";
import { browser } from "process";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `wub_${name}`);

export const links = createTable("link", {
  short_code: varchar("short_code", { length: 8 }).notNull().primaryKey(),
  url: varchar("url", { length: 2048 }).notNull(),
  title: text("title"),
  userId: varchar("userId", { length: 255 })
    .references(() => users.id),
  created_at: timestamp("created_at", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  click_count: integer("click_count").notNull().default(0),
  last_clicked: timestamp("last_clicked", { mode: "date" }),
  expires_at: timestamp("expires_at", { mode: "date" }),
});

export const linksRelations = relations(links, ({ many }) => ({
  clicks: many(clicks)
}));

export const clicks = createTable("click", {
  id: serial("id").primaryKey(),
  short_code: text("short_code").notNull(), // Assuming short_code can be of variable length
  timestamp: timestamp("timestamp", { mode: "date" }).default(sql`CURRENT_TIMESTAMP`),
  userAgent: text("userAgent"),
  ipAddress: text("ipAddress"), // IPv6 addresses can be up to 45 characters
  country: text("country"), // ISO 3166-1 alpha-2 country codes are 2 characters
  city: text("city"),
  region: text("region"),
  latitude: text("latitude"), // Latitude values are typically up to 15 characters
  longitude: text("longitude"), // Longitude values are typically up to 15 characters
  device: text("device"),
  device_vendor: text("device_vendor"),
  device_model: text("device_model"),
  browser: text("browser"),
  browser_version: text("browser_version"),
  engine: text("engine"),
  engine_version: text("engine_version"),
  os: text("os"),
  os_version: text("os_version"),
}, (click) => ({
  shortCodeIdx: index("click_short_code_idx").on(click.short_code)
}));


export const users = createTable("user", {
  id: varchar("id", { length: 255 }).notNull().primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull(),
  emailVerified: timestamp("emailVerified", {
    mode: "date",
  }).default(sql`CURRENT_TIMESTAMP`),
  image: varchar("image", { length: 255 }),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  links: many(links),
}));

export const accounts = createTable(
  "account",
  {
    userId: varchar("userId", { length: 255 })
      .notNull()
      .references(() => users.id),
    type: varchar("type", { length: 255 })
      .$type<AdapterAccount["type"]>()
      .notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("providerAccountId", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    refresh_token_expires_in: integer("refresh_token_expires_in"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    userIdIdx: index("account_userId_idx").on(account.userId),
  })
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "session",
  {
    sessionToken: varchar("sessionToken", { length: 255 })
      .notNull()
      .primaryKey(),
    userId: varchar("userId", { length: 255 })
      .notNull()
      .references(() => users.id),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (session) => ({
    userIdIdx: index("session_userId_idx").on(session.userId),
  })
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verificationToken",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);
