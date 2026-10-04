import { DrizzleAdapter } from "@auth/drizzle-adapter";
import {
  type BaseSQLiteDatabase,
  sqliteTableCreator,
} from "drizzle-orm/sqlite-core";
import { type Adapter } from "next-auth/adapters";

const createTable = sqliteTableCreator((name) => `wub_${name}`);

export function createCloudflareAuthAdapter(
  db: BaseSQLiteDatabase<"async", any, any>,
): Adapter {
  return DrizzleAdapter(db, createTable) as Adapter;
}
