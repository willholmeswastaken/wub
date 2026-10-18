import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";

import {
  clickBucketStart,
  fillClickBuckets,
  previousRangeStart,
  rangeStart,
} from "@/lib/click-date-range";
import { analyticsFromStoredClicks } from "@/server/db/click-stats";
import {
  LOAD_CLICKS_SQL,
  USER_CLICK_COUNTS_SQL,
  loadStoredClicks,
  loadUserClickCounts,
} from "@/server/db/click-stats-sql";
import { clickAnalyticsFromD1 } from "@/server/db/d1-analytics";
import {
  DELETE_CODE_EVENTS_SQL,
  DELETE_GUEST_EVENTS_SQL,
  recordClickOnD1,
} from "@/server/db/record-click-sql";
import { applyD1Schema } from "@/server/db/schema-sql";
import { userLinksWithSparklineCounts } from "@/server/db/sparklines";
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
    const counts = await loadUserClickCounts(
      d1,
      "user-1",
      new Date("2026-09-28T00:00:00.000Z"),
    );
    const links = userLinksWithSparklineCounts(
      [
        {
          short_code: "docs",
          url: "https://example.com",
          created_at: now,
          click_count: 2,
          last_clicked: new Date(currentClick),
        },
      ],
      counts,
      now,
    );
    expect(counts).toEqual([
      { short_code: "docs", day: "2026-10-04", count: 1 },
    ]);
    expect(links[0]?.recentClicks).toEqual([0, 0, 0, 0, 0, 0, 1]);
  } finally {
    await miniflare.dispose();
  }
});

test("sql analytics match the in-memory aggregation", async () => {
  const { miniflare, d1 } = await database();
  const boundaryNow = new Date("2026-10-04T12:30:00.000Z");
  try {
    await insertLink(d1, "docs", "user-1");
    const rows: Array<
      [
        string,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
      ]
    > = [
      // Hour and day buckets, including the open edge of the 24h window.
      [
        "2026-10-04T00:10:00.000Z",
        "US",
        "Austin",
        "mobile",
        "Chrome",
        "iOS",
        "github.com",
      ],
      [
        "2026-10-03T23:50:00.000Z",
        "GB",
        "London",
        "desktop",
        "Firefox",
        "macOS",
        "direct",
      ],
      [
        "2026-10-03T13:00:00.000Z",
        "DE",
        "Berlin",
        "tablet",
        "Safari",
        "Android",
        "t.co",
      ],
      // 1ms before the 24h window: previous period only.
      [
        "2026-10-03T12:59:59.999Z",
        "FR",
        "Paris",
        "mobile",
        "Edge",
        "Windows",
        "news.ycombinator.com",
      ],
      // 1ms before `now` is inside the current hour. Exactly `now` is not.
      [
        "2026-10-04T12:29:59.999Z",
        "JP",
        "Tokyo",
        "desktop",
        "Chrome",
        "macOS",
        "google.com",
      ],
      [
        "2026-10-04T12:30:00.000Z",
        "US",
        "Austin",
        "mobile",
        "Chrome",
        "iOS",
        "direct",
      ],
      // Null, empty, and unknown dimensions. Referrer "unknown" is kept.
      ["2026-10-04T08:00:00.000Z", null, null, null, null, null, null],
      ["2026-10-04T08:15:00.000Z", "", "", "", "", "", ""],
      [
        "2026-10-04T08:30:00.000Z",
        "unknown",
        "unknown",
        "unknown",
        "unknown",
        "unknown",
        "unknown",
      ],
      [
        "2026-10-04T09:00:00.000Z",
        "US",
        "Springfield",
        "mobile",
        "Chrome",
        "iOS",
        "direct",
      ],
      [
        "2026-10-04T09:05:00.000Z",
        "US",
        "Springfield",
        "mobile",
        "Chrome",
        "iOS",
        "direct",
      ],
      [
        "2026-10-04T09:10:00.000Z",
        "AU",
        "Springfield",
        "tablet",
        "Safari",
        "Android",
        "t.co",
      ],
      // Null and empty country for the same city collapse to one row.
      [
        "2026-10-04T10:00:00.000Z",
        null,
        "Paris",
        "desktop",
        "Firefox",
        "Windows",
        "direct",
      ],
      [
        "2026-10-04T10:15:00.000Z",
        "",
        "Paris",
        "desktop",
        "Firefox",
        "Windows",
        "example.com",
      ],
      // Previous 7d window, and a 90d bucket on the UTC day boundary.
      [
        "2026-09-25T08:00:00.000Z",
        "DE",
        "Berlin",
        "tablet",
        "Chrome",
        "Android",
        "t.co",
      ],
      [
        "2026-07-07T00:00:00.000Z",
        "BR",
        "São Paulo",
        "mobile",
        "Chrome",
        "Android",
        "direct",
      ],
      [
        "2026-04-08T00:00:00.000Z",
        "CA",
        "Toronto",
        "desktop",
        "Firefox",
        "macOS",
        "direct",
      ],
      [
        "2026-04-07T23:59:59.999Z",
        "CA",
        "Toronto",
        "desktop",
        "Firefox",
        "macOS",
        "direct",
      ],
      // Leap day, outside the October windows and inside a March 2024 week.
      [
        "2024-02-29T15:30:00.000Z",
        "US",
        "Austin",
        "desktop",
        "Chrome",
        "macOS",
        "direct",
      ],
    ];
    for (const [index, row] of rows.entries()) {
      await d1
        .prepare(
          `INSERT INTO wub_click_event (
             event_id, short_code, recorded_at, country, city, device, browser, os, referrer
           ) VALUES (?1, 'docs', ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
        )
        .bind(`parity-${index}`, Date.parse(row[0]), ...row.slice(1))
        .run();
    }

    for (const range of ["24h", "7d", "30d", "90d"] as const) {
      const aggregated = await clickAnalyticsFromD1(
        d1,
        "docs",
        range,
        boundaryNow,
      );
      const stored = analyticsFromStoredClicks(
        await loadStoredClicks(
          d1,
          "docs",
          previousRangeStart(range, boundaryNow),
          boundaryNow,
        ),
        range,
        boundaryNow,
      );
      expect(aggregated.total).toBe(stored.total);
      expect(aggregated.previousTotal).toBe(stored.previousTotal);
      expect(aggregated.buckets).toEqual(stored.buckets);
      expect(countMap(aggregated.countries)).toEqual(
        countMap(stored.countries),
      );
      expect(countMap(aggregated.cities)).toEqual(countMap(stored.cities));
      expect(countMap(aggregated.devices)).toEqual(countMap(stored.devices));
      expect(countMap(aggregated.browsers)).toEqual(countMap(stored.browsers));
      expect(countMap(aggregated.os)).toEqual(countMap(stored.os));
      expect(countMap(aggregated.referrers)).toEqual(
        countMap(stored.referrers),
      );
      expect(aggregated.buckets.every((bucket) => bucket.count > 0)).toBe(true);
      const filled = fillClickBuckets(range, aggregated.buckets, boundaryNow);
      const expectedBuckets = range === "24h" ? 24 : Number.parseInt(range, 10);
      expect(filled).toHaveLength(expectedBuckets);
      expect(filled.reduce((sum, point) => sum + point.clicks, 0)).toBe(
        aggregated.total,
      );
      expect(filled.some((point) => point.clicks === 0)).toBe(true);
    }

    const day = await clickAnalyticsFromD1(d1, "docs", "24h", boundaryNow);
    expect(bucketCount(day, "2026-10-04T00:00:00.000Z")).toBe(1);
    expect(bucketCount(day, "2026-10-03T23:00:00.000Z")).toBe(1);
    expect(bucketCount(day, "2026-10-03T13:00:00.000Z")).toBe(1);
    expect(bucketCount(day, "2026-10-04T12:00:00.000Z")).toBe(1);
    expect(
      day.buckets.some(
        (bucket) => bucket.at.getTime() === boundaryNow.getTime(),
      ),
    ).toBe(false);
    expect(day.countries.some((item) => item.key === "unknown")).toBe(false);
    expect(day.countries.some((item) => item.key === "")).toBe(false);
    expect(day.devices.some((item) => item.key === "unknown")).toBe(false);
    expect(day.devices.some((item) => item.key === "")).toBe(false);
    expect(day.referrers.map((item) => item.key)).toContain("unknown");
    expect(day.referrers.some((item) => item.key === "")).toBe(false);
    expect(hasCity(day.cities, "Paris", "", 2)).toBe(true);
    expect(hasCity(day.cities, "Springfield", "US", 2)).toBe(true);
    expect(hasCity(day.cities, "Springfield", "AU", 1)).toBe(true);
    expect(day.cities.some((item) => item.key === "unknown")).toBe(false);
    // Exactly `now` is excluded. The click 1ms before the 24h window is previous.
    expect(day.total).toBe(12);
    expect(day.previousTotal).toBe(1);

    const quarter = await clickAnalyticsFromD1(d1, "docs", "90d", boundaryNow);
    expect(bucketCount(quarter, "2026-07-07T00:00:00.000Z")).toBe(1);
    expect(quarter.previousTotal).toBe(1);
    expect(
      quarter.buckets.some(
        (bucket) => bucket.at.toISOString() === "2026-04-07T00:00:00.000Z",
      ),
    ).toBe(false);

    const leapNow = new Date("2024-03-01T12:00:00.000Z");
    const leap = await clickAnalyticsFromD1(d1, "docs", "7d", leapNow);
    expect(bucketCount(leap, "2024-02-29T00:00:00.000Z")).toBe(1);
    expect(leap.buckets[0]?.at.getTime()).toBe(
      clickBucketStart(new Date("2024-02-29T15:30:00.000Z"), "7d").getTime(),
    );
    expect(rangeStart("7d", leapNow).toISOString()).toBe(
      "2024-02-24T00:00:00.000Z",
    );

    const empty = await clickAnalyticsFromD1(d1, "missing", "30d", boundaryNow);
    expect(empty.total).toBe(0);
    expect(empty.previousTotal).toBe(0);
    expect(empty.buckets).toEqual([]);
    expect(empty.countries).toEqual([]);
  } finally {
    await miniflare.dispose();
  }
});

test("breakdown limit does not drop clicks from the totals", async () => {
  const { miniflare, d1 } = await database();
  const boundaryNow = new Date("2026-10-04T12:30:00.000Z");
  try {
    await insertLink(d1, "wide", "user-wide");
    const insert = d1.prepare(
      `INSERT INTO wub_click_event (
         event_id, short_code, recorded_at, country, city, device, browser, os, referrer
       ) VALUES (?1, 'wide', ?2, ?3, ?4, 'desktop', 'Chrome', 'Windows', ?5)`,
    );
    let id = 0;
    for (let copy = 0; copy < 3; copy++) {
      await insert
        .bind(
          `wide-${id++}`,
          boundaryNow.getTime() - 1_000 - copy,
          "H1",
          "KeptCity",
          "kept.example",
        )
        .run();
    }
    for (let index = 1; index <= 60; index++) {
      const country = `C${String(index).padStart(2, "0")}`;
      await insert
        .bind(
          `wide-${id++}`,
          boundaryNow.getTime() - 60_000 - index,
          country,
          `City${country}`,
          `ref-${country}.example`,
        )
        .run();
    }

    const aggregated = await clickAnalyticsFromD1(
      d1,
      "wide",
      "7d",
      boundaryNow,
    );
    const stored = analyticsFromStoredClicks(
      await loadStoredClicks(
        d1,
        "wide",
        previousRangeStart("7d", boundaryNow),
        boundaryNow,
      ),
      "7d",
      boundaryNow,
    );
    expect(aggregated.total).toBe(63);
    expect(aggregated.previousTotal).toBe(0);
    expect(stored.total).toBe(63);
    expect(aggregated.countries).toHaveLength(50);
    expect(countMap(aggregated.countries)).toEqual(countMap(stored.countries));
    expect(countMap(aggregated.cities)).toEqual(countMap(stored.cities));
    expect(countMap(aggregated.referrers)).toEqual(countMap(stored.referrers));
    expect(countMap(aggregated.countries).H1).toBe(3);
    expect(countMap(aggregated.countries).C01).toBe(1);
    expect(aggregated.countries.some((item) => item.key === "C60")).toBe(false);
    const smallest = Math.min(
      ...aggregated.countries.map((item) => item.count),
    );
    const included = countMap(aggregated.countries);
    for (const item of stored.countries) {
      if (item.count > smallest) {
        expect(included[item.key]).toBe(item.count);
      }
    }
  } finally {
    await miniflare.dispose();
  }
});

test("covering index replaces the narrow click indexes", () => {
  const db = new Database(":memory:");
  const apply = () =>
    applyD1Schema(async (query) => {
      db.exec(query);
    });
  return apply().then(async () => {
    await apply();
    const names = (
      db
        .query(
          `SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'wub_click_event'`,
        )
        .all() as Array<{ name: string }>
    ).map((row) => row.name);
    expect(names).toContain("click_event_covering_idx");
    expect(names.includes("click_event_short_code_idx")).toBe(false);
    expect(names.includes("click_event_code_time_idx")).toBe(false);

    db.exec(
      `INSERT INTO wub_user (id, email) VALUES ('user-1', 'user-1@example.com')`,
    );
    db.exec(
      `INSERT INTO wub_link (short_code, url, "userId", created_at) VALUES ('docs', 'https://example.com', 'user-1', 0)`,
    );
    db.exec(
      `INSERT INTO wub_click_event (event_id, short_code, recorded_at, country, city, device, browser, os, referrer)
       VALUES ('evt-1', 'docs', 1, 'US', 'Austin', 'mobile', 'Chrome', 'iOS', 'direct')`,
    );

    const plans = [
      `SELECT (recorded_at / 86400000) * 86400000 AS bucket, COUNT(*) AS n FROM wub_click_event WHERE short_code = ? AND recorded_at >= ? AND recorded_at < ? GROUP BY bucket`,
      `SELECT country AS key, COUNT(*) AS n FROM wub_click_event WHERE short_code = ? AND recorded_at >= ? AND recorded_at < ? AND country IS NOT NULL GROUP BY country ORDER BY n DESC LIMIT 50`,
      LOAD_CLICKS_SQL,
      USER_CLICK_COUNTS_SQL,
      DELETE_CODE_EVENTS_SQL,
      DELETE_GUEST_EVENTS_SQL,
      `DELETE FROM wub_click_event WHERE short_code = ?`,
      `DELETE FROM wub_click_event WHERE short_code IN (?, ?)`,
      `SELECT count(*) AS count FROM wub_click_event WHERE short_code = ?`,
    ];
    for (const sql of plans) {
      const detail = explain(db, sql);
      const plan = detail.join("\n");
      expect(plan).toContain("click_event_covering_idx");
      expect(plan.includes("SCAN wub_click_event")).toBe(false);
    }

    // An alerts migration can add previous_last_clicked and look clicks up by
    // event_id. That lookup uses the primary key, not the indexes 0005 drops.
    // 0004_read_paths.sql does not add the column; this ALTER stands in for it.
    db.exec(
      `ALTER TABLE wub_click_event ADD COLUMN previous_last_clicked integer`,
    );
    const byId = explain(
      db,
      `SELECT short_code, recorded_at, previous_last_clicked FROM wub_click_event WHERE event_id = ?`,
    ).join("\n");
    expect(byId).toContain("sqlite_autoindex_wub_click_event_1");
    expect(byId.includes("SCAN wub_click_event")).toBe(false);
  });
});

function hasCity(
  cities: ReadonlyArray<{ key: string; country: string; count: number }>,
  key: string,
  country: string,
  count: number,
) {
  return cities.some(
    (city) =>
      city.key === key && city.country === country && city.count === count,
  );
}

function countMap(
  items: ReadonlyArray<{ key: string; count: number; country?: string }>,
) {
  return Object.fromEntries(
    items.map((item) => [
      item.country == null ? item.key : `${item.key}\0${item.country}`,
      item.count,
    ]),
  );
}

function bucketCount(
  analytics: { buckets: Array<{ at: Date; count: number }> },
  iso: string,
) {
  return (
    analytics.buckets.find((bucket) => bucket.at.toISOString() === iso)
      ?.count ?? 0
  );
}

function explain(db: Database, sql: string) {
  const numbered = [...sql.matchAll(/\?(\d+)/g)].map((match) =>
    Number(match[1]),
  );
  const placeholders =
    numbered.length > 0
      ? Math.max(...numbered)
      : (sql.match(/\?/g)?.length ?? 0);
  const params = Array.from({ length: placeholders }, (_, index) => index + 1);
  return (
    db.query(`EXPLAIN QUERY PLAN ${sql}`).all(...params) as Array<{
      detail: string;
    }>
  ).map((row) => row.detail);
}

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
