import { expect, test } from "bun:test";

import {
  deleteExpiredGuestLinksOnD1,
  recordClickOnD1,
} from "@/server/db/record-click-sql";
import { applyD1Schema } from "@/server/db/schema-sql";
import { Miniflare } from "miniflare";

async function database() {
  const miniflare = new Miniflare({
    workers: [
      {
        config: {
          name: "wub-clicks",
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
            DB: { type: "d1", name: "wub-clicks" },
          },
        },
      },
    ],
  });
  const d1 = await miniflare.getD1Database("DB");
  await applyD1Schema((query) => d1.exec(query));
  return { miniflare, d1 };
}

test("a click increments once and a replay does not", async () => {
  const { miniflare, d1 } = await database();
  try {
    await d1
      .prepare(
        `INSERT INTO wub_link (short_code, url, created_at) VALUES (?1, ?2, ?3)`,
      )
      .bind("docs", "https://example.com", Date.now())
      .run();

    const event = {
      event_id: "11111111-1111-4111-8111-111111111111",
      short_code: "docs",
    };
    expect(await recordClickOnD1(d1, event, 1_000)).toBe("recorded");
    expect(await recordClickOnD1(d1, event, 2_000)).toBe("duplicate");

    const link = await d1
      .prepare(`SELECT click_count FROM wub_link WHERE short_code = ?1`)
      .bind("docs")
      .first<{ click_count: number }>();
    const events = await d1
      .prepare(
        `SELECT count(*) AS count FROM wub_click_event WHERE short_code = ?1`,
      )
      .bind("docs")
      .first<{ count: number }>();
    expect(link?.click_count).toBe(1);
    expect(events?.count).toBe(1);
  } finally {
    await miniflare.dispose();
  }
});

test("recording a click for a missing link does not insert an event", async () => {
  const { miniflare, d1 } = await database();
  try {
    const outcome = await recordClickOnD1(
      d1,
      {
        event_id: "22222222-2222-4222-8222-222222222222",
        short_code: "gone",
      },
      1_000,
    );
    expect(outcome).toBe("not_found");
    const events = await d1
      .prepare(`SELECT count(*) AS count FROM wub_click_event`)
      .first<{ count: number }>();
    expect(events?.count).toBe(0);
  } finally {
    await miniflare.dispose();
  }
});

test("expired guest links are deleted with their click events", async () => {
  const { miniflare, d1 } = await database();
  try {
    const past = Date.now() - 60_000;
    await d1
      .prepare(`INSERT INTO wub_user (id, email) VALUES (?1, ?2)`)
      .bind("user-1", "ada@example.com")
      .run();
    await d1
      .prepare(
        `INSERT INTO wub_link (short_code, url, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)`,
      )
      .bind("temp", "https://example.com", past, past)
      .run();
    await d1
      .prepare(
        `INSERT INTO wub_link (short_code, url, "userId", created_at) VALUES (?1, ?2, ?3, ?4)`,
      )
      .bind("kept", "https://example.com", "user-1", past)
      .run();
    await recordClickOnD1(
      d1,
      {
        event_id: "44444444-4444-4444-8444-444444444444",
        short_code: "temp",
      },
      past,
    );
    const removed = await deleteExpiredGuestLinksOnD1(d1, Date.now());
    expect(removed).toEqual(["temp"]);
    const remaining = await d1
      .prepare(`SELECT short_code FROM wub_link`)
      .all<{ short_code: string }>();
    expect(remaining.results?.map((row) => row.short_code)).toEqual(["kept"]);
    const events = await d1
      .prepare(`SELECT count(*) AS count FROM wub_click_event`)
      .first<{ count: number }>();
    expect(events?.count).toBe(0);
  } finally {
    await miniflare.dispose();
  }
});

test("deleting a link removes its click events", async () => {
  const { miniflare, d1 } = await database();
  try {
    await d1
      .prepare(
        `INSERT INTO wub_link (short_code, url, userId, created_at) VALUES (?1, ?2, ?3, ?4)`,
      )
      .bind("docs", "https://example.com", null, Date.now())
      .run();
    await recordClickOnD1(
      d1,
      {
        event_id: "33333333-3333-4333-8333-333333333333",
        short_code: "docs",
      },
      1_000,
    );
    await d1
      .prepare(`DELETE FROM wub_click_event WHERE short_code = ?1`)
      .bind("docs")
      .run();
    await d1
      .prepare(`DELETE FROM wub_link WHERE short_code = ?1`)
      .bind("docs")
      .run();
    const events = await d1
      .prepare(`SELECT count(*) AS count FROM wub_click_event`)
      .first<{ count: number }>();
    expect(events?.count).toBe(0);
  } finally {
    await miniflare.dispose();
  }
});
