import { expect, test } from "bun:test";

import {
  claimAlertEmailOnD1,
  createAlertRuleOnD1,
  evaluateClickAlertsOnD1,
  listAlertsOnD1,
  resetAlertRuleOnD1,
  settleAlertEmailOnD1,
  unreadAlertCountOnD1,
} from "@/server/alerts/d1-store";
import { recordClickOnD1 } from "@/server/db/record-click-sql";
import { applyD1Schema } from "@/server/db/schema-sql";
import { Miniflare } from "miniflare";

const QUIET = 1_000;

async function database() {
  const miniflare = new Miniflare({
    workers: [
      {
        config: {
          name: "wub-alerts",
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
            DB: { type: "d1", name: "wub-alerts" },
          },
        },
      },
    ],
  });
  const d1 = await miniflare.getD1Database("DB");
  await applyD1Schema((query) => d1.exec(query));
  return { miniflare, d1 };
}

async function seedLink(
  d1: Awaited<ReturnType<typeof database>>["d1"],
  input: {
    code: string;
    userId?: string;
    createdAt: number;
    clicks?: number;
    lastClicked?: number | null;
  },
) {
  if (input.userId) {
    await d1
      .prepare(
        `INSERT INTO wub_user (id, email) VALUES (?1, ?2)
         ON CONFLICT (id) DO NOTHING`,
      )
      .bind(input.userId, `${input.userId}@example.com`)
      .run();
  }
  await d1
    .prepare(
      `INSERT INTO wub_link (short_code, url, "userId", created_at, click_count, last_clicked)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
    .bind(
      input.code,
      "https://example.com",
      input.userId ?? null,
      input.createdAt,
      input.clicks ?? 0,
      input.lastClicked ?? null,
    )
    .run();
}

async function seedRule(
  d1: Awaited<ReturnType<typeof database>>["d1"],
  input: {
    id: string;
    userId: string;
    code: string;
    type: "milestone" | "wakeup";
    threshold?: number | null;
    status?: string;
  },
) {
  await d1
    .prepare(
      `INSERT INTO wub_alert_rule (
         id, user_id, short_code, type, threshold, status, generation, created_at, updated_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?7)`,
    )
    .bind(
      input.id,
      input.userId,
      input.code,
      input.type,
      input.threshold ?? null,
      input.status ?? "active",
      1,
    )
    .run();
}

function click(id: string, code: string) {
  return {
    event_id: id,
    short_code: code,
  };
}

test("a milestone fires once under concurrent clicks", async () => {
  const { miniflare, d1 } = await database();
  try {
    await seedLink(d1, { code: "docs", userId: "ada", createdAt: 1 });
    await seedRule(d1, {
      id: "rule-100",
      userId: "ada",
      code: "docs",
      type: "milestone",
      threshold: 2,
    });
    const first = "11111111-1111-4111-8111-111111111111";
    const second = "22222222-2222-4222-8222-222222222222";
    expect(await recordClickOnD1(d1, click(first, "docs"), 10)).toBe(
      "recorded",
    );
    expect(await evaluateClickAlertsOnD1(d1, first)).toEqual([]);
    expect(await recordClickOnD1(d1, click(second, "docs"), 20)).toBe(
      "recorded",
    );
    const [left, right] = await Promise.all([
      evaluateClickAlertsOnD1(d1, second),
      evaluateClickAlertsOnD1(d1, second),
    ]);
    const fired = [...left, ...right];
    expect(new Set(fired.map((alert) => alert.alertId)).size).toBe(1);
    expect(fired[0]?.clickCount).toBe(2);
    expect(fired[0]?.emailEnabled).toBe(true);
    const again = await evaluateClickAlertsOnD1(d1, second);
    expect(again.map((alert) => alert.alertId)).toEqual([fired[0]?.alertId]);
    const alerts = await listAlertsOnD1(d1, "ada");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.type).toBe("milestone");
    expect(await unreadAlertCountOnD1(d1, "ada")).toBe(1);
  } finally {
    await miniflare.dispose();
  }
});

test("two different clicks crossing the threshold insert one alert", async () => {
  const { miniflare, d1 } = await database();
  try {
    await seedLink(d1, { code: "docs", userId: "ada", createdAt: 1 });
    await seedRule(d1, {
      id: "rule-1",
      userId: "ada",
      code: "docs",
      type: "milestone",
      threshold: 1,
    });
    const first = "33333333-3333-4333-8333-333333333333";
    const second = "44444444-4444-4444-8444-444444444444";
    await recordClickOnD1(d1, click(first, "docs"), 10);
    await recordClickOnD1(d1, click(second, "docs"), 11);
    const [a, b] = await Promise.all([
      evaluateClickAlertsOnD1(d1, first),
      evaluateClickAlertsOnD1(d1, second),
    ]);
    expect(a.length + b.length).toBe(1);
    expect(await listAlertsOnD1(d1, "ada")).toHaveLength(1);
  } finally {
    await miniflare.dispose();
  }
});

test("a paused milestone does not fire", async () => {
  const { miniflare, d1 } = await database();
  try {
    await seedLink(d1, { code: "docs", userId: "ada", createdAt: 1 });
    await seedRule(d1, {
      id: "rule-paused",
      userId: "ada",
      code: "docs",
      type: "milestone",
      threshold: 1,
      status: "paused",
    });
    const id = "55555555-5555-4555-8555-555555555555";
    await recordClickOnD1(d1, click(id, "docs"), 10);
    expect(await evaluateClickAlertsOnD1(d1, id)).toEqual([]);
    expect(await listAlertsOnD1(d1, "ada")).toEqual([]);
  } finally {
    await miniflare.dispose();
  }
});

test("resetting a fired milestone lets the next click fire again", async () => {
  const { miniflare, d1 } = await database();
  try {
    await seedLink(d1, { code: "docs", userId: "ada", createdAt: 1 });
    await seedRule(d1, {
      id: "rule-reset",
      userId: "ada",
      code: "docs",
      type: "milestone",
      threshold: 1,
    });
    const first = "66666666-6666-4666-8666-666666666666";
    await recordClickOnD1(d1, click(first, "docs"), 10);
    expect(await evaluateClickAlertsOnD1(d1, first)).toHaveLength(1);
    const reset = await resetAlertRuleOnD1(d1, "rule-reset", "ada", 20);
    expect(reset?.status).toBe("active");
    const second = "77777777-7777-4777-8777-777777777777";
    await recordClickOnD1(d1, click(second, "docs"), 30);
    expect(await evaluateClickAlertsOnD1(d1, second)).toHaveLength(1);
    expect(await listAlertsOnD1(d1, "ada")).toHaveLength(2);
  } finally {
    await miniflare.dispose();
  }
});

test("wake-up fires once per quiet period and re-arms", async () => {
  const { miniflare, d1 } = await database();
  try {
    await seedLink(d1, { code: "docs", userId: "ada", createdAt: 0 });
    await seedRule(d1, {
      id: "rule-wake",
      userId: "ada",
      code: "docs",
      type: "wakeup",
    });
    const early = "88888888-8888-4888-8888-888888888888";
    await recordClickOnD1(d1, click(early, "docs"), 100);
    expect(await evaluateClickAlertsOnD1(d1, early, QUIET)).toEqual([]);

    const wake = "99999999-9999-4999-8999-999999999999";
    await recordClickOnD1(d1, click(wake, "docs"), 100 + QUIET);
    expect(await evaluateClickAlertsOnD1(d1, wake, QUIET)).toHaveLength(1);

    const still = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    await recordClickOnD1(d1, click(still, "docs"), 100 + QUIET + 10);
    expect(await evaluateClickAlertsOnD1(d1, still, QUIET)).toEqual([]);

    const again = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    await recordClickOnD1(d1, click(again, "docs"), 100 + QUIET + 10 + QUIET);
    const second = await evaluateClickAlertsOnD1(d1, again, QUIET);
    expect(second).toHaveLength(1);
    expect(await listAlertsOnD1(d1, "ada")).toHaveLength(2);
  } finally {
    await miniflare.dispose();
  }
});

test("email off still records the alert and marks it not to send", async () => {
  const { miniflare, d1 } = await database();
  try {
    await seedLink(d1, { code: "docs", userId: "ada", createdAt: 1 });
    await d1
      .prepare(
        `INSERT INTO wub_notification_pref (user_id, email_enabled) VALUES (?1, 0)`,
      )
      .bind("ada")
      .run();
    await seedRule(d1, {
      id: "rule-mail",
      userId: "ada",
      code: "docs",
      type: "milestone",
      threshold: 1,
    });
    const id = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    await recordClickOnD1(d1, click(id, "docs"), 10);
    const pending = await evaluateClickAlertsOnD1(d1, id);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.emailEnabled).toBe(false);
    expect(await listAlertsOnD1(d1, "ada")).toHaveLength(1);
    const alertId = pending[0]?.alertId ?? "";
    expect(await claimAlertEmailOnD1(d1, alertId)).toBeNull();
    const state = await d1
      .prepare(`SELECT email_state FROM wub_alert WHERE id = ?1`)
      .bind(alertId)
      .first<{ email_state: string }>();
    expect(state?.email_state).toBe("skipped");
  } finally {
    await miniflare.dispose();
  }
});

test("claiming an alert email is exclusive", async () => {
  const { miniflare, d1 } = await database();
  try {
    await seedLink(d1, { code: "docs", userId: "ada", createdAt: 1 });
    await seedRule(d1, {
      id: "rule-claim",
      userId: "ada",
      code: "docs",
      type: "milestone",
      threshold: 1,
    });
    const id = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    await recordClickOnD1(d1, click(id, "docs"), 10);
    const pending = await evaluateClickAlertsOnD1(d1, id);
    const alertId = pending[0]?.alertId ?? "";
    const [first, second] = await Promise.all([
      claimAlertEmailOnD1(d1, alertId),
      claimAlertEmailOnD1(d1, alertId),
    ]);
    const claims = [first, second].filter((claim) => claim != null);
    expect(claims).toHaveLength(1);
    await settleAlertEmailOnD1(d1, alertId, "sent");
    expect(await claimAlertEmailOnD1(d1, alertId)).toBeNull();
  } finally {
    await miniflare.dispose();
  }
});

test("a duplicate milestone threshold is rejected", async () => {
  const { miniflare, d1 } = await database();
  try {
    await seedLink(d1, { code: "docs", userId: "ada", createdAt: 1 });
    const first = await createAlertRuleOnD1(d1, {
      id: "rule-a",
      userId: "ada",
      shortCode: "docs",
      type: "milestone",
      threshold: 10,
    });
    const second = await createAlertRuleOnD1(d1, {
      id: "rule-b",
      userId: "ada",
      shortCode: "docs",
      type: "milestone",
      threshold: 10,
    });
    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, reason: "conflict" });
  } finally {
    await miniflare.dispose();
  }
});
