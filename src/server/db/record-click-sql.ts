const INSERT_CLICK_EVENT_SQL = `
INSERT INTO wub_click_event (event_id, short_code, recorded_at)
SELECT ?1, ?2, ?3
WHERE EXISTS (SELECT 1 FROM wub_link WHERE short_code = ?2)
ON CONFLICT (event_id) DO NOTHING
`;

const INCREMENT_LINK_SQL = `
UPDATE wub_link
SET click_count = click_count + 1,
    last_clicked = ?2
WHERE short_code = ?1
  AND changes() = 1
`;

type BoundStatement = {
  run(): Promise<{ meta?: { changes?: number } }>;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results?: T[] }>;
};

type Statement = {
  bind(...values: unknown[]): BoundStatement;
};

export type ClickStatementDatabase = {
  prepare(query: string): Statement;
  batch(
    statements: BoundStatement[],
  ): Promise<Array<{ meta?: { changes?: number } }>>;
};

export type RecordClickResult = "recorded" | "duplicate" | "not_found";

export async function recordClickOnD1(
  database: ClickStatementDatabase,
  event: { event_id: string; short_code: string },
  now = Date.now(),
): Promise<RecordClickResult> {
  const [updated] = (
    await database.batch([
      database
        .prepare(INSERT_CLICK_EVENT_SQL)
        .bind(event.event_id, event.short_code, now),
      database.prepare(INCREMENT_LINK_SQL).bind(event.short_code, now),
    ])
  ).slice(1);
  if ((updated?.meta?.changes ?? 0) > 0) return "recorded";

  const link = await database
    .prepare(`SELECT 1 AS ok FROM wub_link WHERE short_code = ?1`)
    .bind(event.short_code)
    .first();
  return link ? "duplicate" : "not_found";
}

export async function deleteExpiredGuestLinksOnD1(
  database: ClickStatementDatabase,
  now = Date.now(),
) {
  const deleted = await database
    .prepare(
      `DELETE FROM wub_link
       WHERE "userId" IS NULL AND expires_at IS NOT NULL AND expires_at <= ?1
       RETURNING short_code`,
    )
    .bind(now)
    .all<{ short_code: string }>();
  const codes = (deleted.results ?? []).map((row) => row.short_code);
  if (codes.length === 0) return [];
  const placeholders = codes.map((_, index) => `?${index + 1}`).join(", ");
  await database.batch([
    database
      .prepare(
        `DELETE FROM wub_click_event WHERE short_code IN (${placeholders})`,
      )
      .bind(...codes),
    database
      .prepare(`DELETE FROM wub_click WHERE short_code IN (${placeholders})`)
      .bind(...codes),
  ]);
  return codes;
}
