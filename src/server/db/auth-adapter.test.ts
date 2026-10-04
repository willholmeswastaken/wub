import { expect, test } from "bun:test";

import { sessionWithUserId } from "@/server/auth-session";
import {
  defaultDatabaseProvider,
  resolveDatabaseProvider,
} from "@/server/db/provider";
import { D1_BOOTSTRAP_STATEMENTS } from "@/server/db/schema-sql";
import { links } from "@/server/db/schema.d1";
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
    for (const statement of D1_BOOTSTRAP_STATEMENTS) {
      await d1.exec(statement);
    }
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

    const database = drizzle(d1, { schema: { links } });
    await database
      .insert(links)
      .values({
        short_code: "abc12345",
        url: "https://example.com",
        userId: user.id,
        expires_at: null,
      })
      .run();
    const link = await database.query.links.findFirst({
      where: eq(links.short_code, "abc12345"),
    });
    expect(link?.userId).toBe(user.id);
    expect(link?.url).toBe("https://example.com");
  } finally {
    await miniflare.dispose();
  }
});
