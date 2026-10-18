import { expect, test } from "bun:test";

import {
  LOAD_CLICKS_SQL,
  USER_CLICK_COUNTS_SQL,
} from "@/server/db/click-stats-sql";
import { SELECT_EXPIRED_GUEST_LINKS_SQL } from "@/server/db/record-click-sql";
import { applyD1Schema } from "@/server/db/schema-sql";
import { Miniflare } from "miniflare";

test("hot queries use indexes and skip unrelated rows", async () => {
  const miniflare = new Miniflare({
    workers: [
      {
        config: {
          name: "wub-indexes",
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
            DB: { type: "d1", name: "wub-indexes" },
          },
        },
      },
    ],
  });

  try {
    const d1 = await miniflare.getD1Database("DB");
    await applyD1Schema((query) => d1.exec(query));
    const now = Date.parse("2026-10-04T12:00:00.000Z");
    const recent = Date.parse("2026-10-04T08:00:00.000Z");
    const old = Date.parse("2026-01-01T00:00:00.000Z");
    const link = d1.prepare(
      `INSERT INTO wub_link (short_code, url, "userId", created_at, expires_at) VALUES (?1, 'https://example.com', ?2, ?3, ?4)`,
    );
    const click = d1.prepare(
      `INSERT INTO wub_click_event (event_id, short_code, recorded_at, country) VALUES (?1, ?2, ?3, 'US')`,
    );
    await d1.batch([
      d1
        .prepare(`INSERT INTO wub_user (id, email) VALUES (?1, ?2)`)
        .bind("user-1", "ada@example.com"),
      d1
        .prepare(`INSERT INTO wub_user (id, email) VALUES (?1, ?2)`)
        .bind("user-2", "grace@example.com"),
      link.bind("docs", "user-1", old, null),
      link.bind("other", "user-2", old, null),
      link.bind("expired", null, old, old),
      ...Array.from({ length: 200 }, (_, index) =>
        link.bind(`guest-${index}`, null, old, now + 86_400_000),
      ),
      ...Array.from({ length: 300 }, (_, index) =>
        click.bind(`other-${index}`, "other", recent),
      ),
      ...Array.from({ length: 80 }, (_, index) =>
        click.bind(`old-${index}`, "docs", old),
      ),
      click.bind("recent-1", "docs", recent),
      click.bind("recent-2", "docs", recent),
    ]);

    const clicks = await d1
      .prepare(LOAD_CLICKS_SQL)
      .bind("docs", recent - 1, now)
      .all();
    expect(clicks.results).toHaveLength(2);
    expect(withinBudget(clicks.meta?.rows_read, 10)).toBe("indexed");
    expect(await plan(d1, LOAD_CLICKS_SQL, "docs", recent - 1, now)).toContain(
      "click_event_covering_idx",
    );

    const counts = await d1
      .prepare(USER_CLICK_COUNTS_SQL)
      .bind("user-1", recent - 1)
      .all();
    expect(counts.results).toEqual([
      { short_code: "docs", day: "2026-10-04", count: 2 },
    ]);
    expect(withinBudget(counts.meta?.rows_read, 20)).toBe("indexed");
    const sparklinePlan = await plan(
      d1,
      USER_CLICK_COUNTS_SQL,
      "user-1",
      recent,
    );
    expect(sparklinePlan).toContain("link_user_created_idx");
    expect(sparklinePlan).toContain("click_event_covering_idx");
    expect(sparklinePlan.includes("SCAN") ? sparklinePlan : "indexed").toBe(
      "indexed",
    );

    const expired = await d1
      .prepare(SELECT_EXPIRED_GUEST_LINKS_SQL)
      .bind(now)
      .all<{ short_code: string }>();
    expect(expired.results?.map((row) => row.short_code)).toEqual(["expired"]);
    expect(withinBudget(expired.meta?.rows_read, 10)).toBe("indexed");
    expect(await plan(d1, SELECT_EXPIRED_GUEST_LINKS_SQL, now)).toContain(
      "link_guest_expiry_idx",
    );

    const email = await d1
      .prepare(`SELECT id FROM wub_user WHERE email = ?1`)
      .bind("ada@example.com")
      .all();
    expect(withinBudget(email.meta?.rows_read, 5)).toBe("indexed");
    expect(
      await plan(
        d1,
        `SELECT id FROM wub_user WHERE email = ?1`,
        "ada@example.com",
      ),
    ).toContain("user_email_idx");

    const links = await d1
      .prepare(
        `SELECT short_code FROM wub_link WHERE "userId" = ?1 ORDER BY created_at DESC`,
      )
      .bind("user-1")
      .all();
    expect(links.results).toEqual([{ short_code: "docs" }]);
    expect(
      await plan(
        d1,
        `SELECT short_code FROM wub_link WHERE "userId" = ?1 ORDER BY created_at DESC`,
        "user-1",
      ),
    ).toContain("link_user_created_idx");
  } finally {
    await miniflare.dispose();
  }
});

function withinBudget(rowsRead: number | undefined, limit: number) {
  const rows = rowsRead ?? 0;
  return rows < limit ? "indexed" : `scanned ${rows}`;
}

async function plan(
  d1: Awaited<ReturnType<Miniflare["getD1Database"]>>,
  sql: string,
  ...values: unknown[]
) {
  const result = await d1
    .prepare(`EXPLAIN QUERY PLAN ${sql}`)
    .bind(...values)
    .all<{ detail: string }>();
  return (result.results ?? []).map((row) => row.detail).join("\n");
}
