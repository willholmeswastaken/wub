import { expect, test } from "bun:test";

import { sessionWithUserId } from "@/server/auth-session";
import {
  defaultDatabaseProvider,
  resolveDatabaseProvider,
} from "@/server/db/provider";
import { applyD1Schema } from "@/server/db/schema-sql";
import { clicks, links } from "@/server/db/schema.d1";
import { createCloudflareAuthAdapter } from "@/server/db/sqlite-auth";
import { type AdapterUser } from "@auth/core/adapters";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Miniflare } from "miniflare";

test("workers use cloudflare and other runtimes use neon unless overridden", () => {
  expect(defaultDatabaseProvider()).toBe("neon");
  expect(resolveDatabaseProvider("cloudflare")).toBe("cloudflare");
  expect(resolveDatabaseProvider("neon")).toBe("neon");
  expect(resolveDatabaseProvider()).toBe("neon");
});

test("session callback keeps the database user id", () => {
  const session = sessionWithUserId({
    session: {
      expires: "2099-01-01T00:00:00.000Z",
      user: { name: "Ada", email: "ada@example.com" },
    },
    user: {
      id: "user-1",
    },
  });

  expect(session.user.id).toBe("user-1");
});

test("github auth is stored in cloudflare d1", async () => {
  const miniflare = new Miniflare({
    workers: [
      {
        config: {
          name: "wub",
          compatibilityDate: "2026-10-01",
          manifest: {
            mainModule: "index.js",
            modules: {
              "index.js": {
                type: "esm",
                contents:
                  "export default { fetch() { return new Response('ok') } }",
              },
            },
          },
          env: {
            DB: { type: "d1", name: "wub" },
          },
        },
      },
    ],
  });

  try {
    const d1 = await miniflare.getD1Database("DB");
    await applyD1Schema((query) => d1.exec(query));
    const db = drizzle(d1);
    const adapter = createCloudflareAuthAdapter(db);

    const user = await adapter.createUser!({
      id: "pending",
      name: "Ada",
      email: "ada@example.com",
      emailVerified: null,
    } as AdapterUser);
    await adapter.linkAccount!({
      userId: user.id,
      type: "oauth",
      provider: "github",
      providerAccountId: "42",
      access_token: "token",
      refresh_token: "refresh",
      token_type: "bearer",
      scope: "read:user",
    });
    const session = await adapter.createSession!({
      sessionToken: "session-token",
      userId: user.id,
      expires: new Date(Date.now() + 86_400_000),
    });
    const loaded = await adapter.getSessionAndUser!(session.sessionToken);

    expect(loaded?.user.id).toBe(user.id);
    expect(loaded?.user.email).toBe("ada@example.com");

    const linked = await adapter.getUserByAccount!({
      provider: "github",
      providerAccountId: "42",
    });
    expect(linked?.id).toBe(user.id);

    const database = drizzle(d1, { schema: { clicks, links } });
    await database
      .insert(links)
      .values({
        short_code: "my-custom-slug",
        url: "https://example.com",
        userId: user.id,
        expires_at: null,
        claim_token: "claim-1",
      })
      .run();
    await database
      .insert(clicks)
      .values({
        short_code: "my-custom-slug",
        referrer: "github.com",
      })
      .run();
    const link = await database.query.links.findFirst({
      where: eq(links.short_code, "my-custom-slug"),
    });
    const click = await database.query.clicks.findFirst({
      where: eq(clicks.short_code, "my-custom-slug"),
    });
    expect(link?.userId).toBe(user.id);
    expect(link?.url).toBe("https://example.com");
    expect(link?.claim_token).toBe("claim-1");
    expect(click?.referrer).toBe("github.com");
  } finally {
    await miniflare.dispose();
  }
});

test("new columns are added to an existing d1 database", async () => {
  const miniflare = new Miniflare({
    workers: [
      {
        config: {
          name: "wub-migrate",
          compatibilityDate: "2026-10-01",
          manifest: {
            mainModule: "index.js",
            modules: {
              "index.js": {
                type: "esm",
                contents:
                  "export default { fetch() { return new Response('ok') } }",
              },
            },
          },
          env: {
            DB: { type: "d1", name: "wub-migrate" },
          },
        },
      },
    ],
  });

  try {
    const d1 = await miniflare.getD1Database("DB");
    await d1.exec(
      `CREATE TABLE "wub_link" ("short_code" text PRIMARY KEY NOT NULL, "url" text NOT NULL, "title" text, "userId" text, "created_at" integer NOT NULL, "click_count" integer DEFAULT 0 NOT NULL, "last_clicked" integer, "expires_at" integer)`,
    );
    await d1.exec(
      `CREATE TABLE "wub_click" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "short_code" text NOT NULL, "timestamp" integer, "userAgent" text, "ipAddress" text, "country" text, "city" text, "region" text, "latitude" text, "longitude" text, "device" text, "device_vendor" text, "device_model" text, "browser" text, "browser_version" text, "engine" text, "engine_version" text, "os" text, "os_version" text, "cpu_architecture" text)`,
    );
    await applyD1Schema((query) => d1.exec(query));
    await applyD1Schema((query) => d1.exec(query));

    const database = drizzle(d1, { schema: { clicks, links } });
    await database
      .insert(links)
      .values({
        short_code: "kept",
        url: "https://example.com",
        claim_token: "claim-2",
      })
      .run();
    await database
      .insert(clicks)
      .values({ short_code: "kept", referrer: "direct" })
      .run();
    const link = await database.query.links.findFirst();
    const click = await database.query.clicks.findFirst();
    expect(link?.claim_token).toBe("claim-2");
    expect(click?.referrer).toBe("direct");
  } finally {
    await miniflare.dispose();
  }
});
