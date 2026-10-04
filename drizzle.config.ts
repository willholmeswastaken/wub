import { env } from "@/env";
import { type Config } from "drizzle-kit";

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url:
      env.DATABASE_URL ?? "postgresql://postgres:password@localhost:5432/wub",
  },
  tablesFilter: ["wub_*"],
} satisfies Config;
