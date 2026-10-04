import { type Config } from "drizzle-kit";

export default {
  schema: "./src/server/db/schema.d1.ts",
  out: "./drizzle/d1",
  dialect: "sqlite",
  dbCredentials: {
    url: "file:./.data/d1.sqlite",
  },
  tablesFilter: ["wub_*"],
} satisfies Config;
