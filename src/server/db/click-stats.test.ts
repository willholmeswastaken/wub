import { expect, test } from "bun:test";

import { loadUserClickStamps } from "@/server/db/click-stats-sql";
import { clickAnalyticsFromD1 } from "@/server/db/d1-analytics";
import { recordClickOnD1 } from "@/server/db/record-click-sql";
import { applyD1Schema } from "@/server/db/schema-sql";
import { userLinksWithSparklines } from "@/server/db/sparklines";
import { Miniflare } from "miniflare";

const now = new Date("2026-10-04T12:00:00.000Z");
const currentClick = Date.parse("2026-10-04T08:00:00.000Z");
const previousClick = Date.parse("2026-09-25T08:00:00.000Z");

test("stored clicks stay on the analytics page", async () => {
  const { miniflare, d1 } = await database();
  try {
    await insertLink(d1, "docs", "user-1");
    await recordClickOnD1(
      d1,
      {
        event_id: "11111111-1111-4111-8111-111111111111",
        short_code: "docs",
        country: "US",
        city: "Austin",
        device: "mobile",
        browser: "Chrome",
        os: "iOS",
        referrer: "github.com",
      },
      currentClick,
    );
    await recordClickOnD1(
      d1,
      {
        event_id: "22222222-2222-4222-8222-222222222222",
        short_code: "docs",
        country: "US",
        city: "Austin",
        device: "mobile",
        browser: "Chrome",
        os: "iOS",
        referrer: "direct",
      },
      previousClick,
    );

    const analytics = await clickAnalyticsFromD1(d1, "docs", "7d", now);
    expect(analytics.total).toBe(1);
    expect(analytics.previousTotal).toBe(1);
    expect(analytics.buckets).toEqual([
      { at: new Date("2026-10-04T00:00:00.000Z"), count: 1 },
    ]);
    expect(analytics.countries).toEqual([{ key: "US", count: 1 }]);
    expect(analytics.cities).toEqual([
      { key: "Austin", country: "US", count: 1 },
    ]);
    expect(analytics.referrers).toEqual([{ key: "github.com", count: 1 }]);
  } finally {
    await miniflare.dispose();
  }
});

test("dashboard sparklines come from the click log", async () => {
  const { miniflare, d1 } = await database();
  try {
    await insertLink(d1, "docs", "user-1");
    await insertLink(d1, "other", "user-2");
    await recordClickOnD1(
      d1,
      { event_id: "44444444-4444-4444-8444-444444444444", short_code: "docs" },
      currentClick,
    );
    await recordClickOnD1(
      d1,
      { event_id: "55555555-5555-4555-8555-555555555555", short_code: "other" },
      currentClick,
    );
    await recordClickOnD1(
      d1,
      { event_id: "66666666-6666-4666-8666-666666666666", short_code: "docs" },
      Date.parse("2026-09-01T00:00:00.000Z"),
    );
    const stamps = await loadUserClickStamps(
      d1,
      "user-1",
      new Date("2026-09-28T00:00:00.000Z"),
    );
    const links = userLinksWithSparklines(
      [
        {
          short_code: "docs",
          url: "https://example.com",
          created_at: now,
          click_count: 2,
          last_clicked: new Date(currentClick),
        },
      ],
      stamps,
      now,
    );
    expect(stamps).toHaveLength(1);
    expect(links[0]?.recentClicks).toEqual([0, 0, 0, 0, 0, 0, 1]);
  } finally {
    await miniflare.dispose();
  }
});

async function insertLink(
  d1: Awaited<ReturnType<typeof database>>["d1"],
  code: string,
  userId: string,
) {
  await d1
    .prepare(`INSERT INTO wub_user (id, email) VALUES (?1, ?2)`)
    .bind(userId, `${userId}@example.com`)
    .run();
  await d1
    .prepare(
      `INSERT INTO wub_link (short_code, url, "userId", created_at) VALUES (?1, ?2, ?3, ?4)`,
    )
    .bind(code, "https://example.com", userId, currentClick)
    .run();
}

async function database() {
  const miniflare = new Miniflare({
    workers: [
      {
        config: {
          name: "wub-click-stats",
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
            DB: { type: "d1", name: "wub-click-stats" },
          },
        },
      },
    ],
  });
  const d1 = await miniflare.getD1Database("DB");
  await applyD1Schema((query) => d1.exec(query));
  return { miniflare, d1 };
}
