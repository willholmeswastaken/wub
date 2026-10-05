import { type ClickRange, previousRangeStart } from "@/lib/click-date-range";

import { analyticsFromStoredClicks } from "./click-stats";
import { loadStoredClicks } from "./click-stats-sql";
import { type ClickStatementDatabase } from "./record-click-sql";

export async function clickAnalyticsFromD1(
  database: ClickStatementDatabase,
  code: string,
  range: ClickRange,
  now = new Date(),
) {
  const rows = await loadStoredClicks(
    database,
    code,
    previousRangeStart(range, now),
    now,
  );
  return analyticsFromStoredClicks(rows, range, now);
}
