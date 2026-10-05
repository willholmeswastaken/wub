import {
  type ClickRange,
  previousRangeStart,
  rangeStart,
} from "@/lib/click-date-range";
import logger from "@/server/logger";

import {
  analyticsFromStoredClicks,
  clicksWithDimensions,
  dimensionBackfill,
  needsDimensionBackfill,
  type ImportedClick,
  type StoredClick,
} from "./click-stats";
import { loadStoredClicks, saveClickDimensions } from "./click-stats-sql";
import { type ClickStatementDatabase } from "./record-click-sql";

export async function clickAnalyticsFromD1(
  database: ClickStatementDatabase,
  code: string,
  range: ClickRange,
  now = new Date(),
  readEngine?: (code: string, now: Date) => Promise<ImportedClick[] | null>,
) {
  const displayStart = previousRangeStart(range, now);
  const backfillStart = rangeStart("90d", now);
  const loadStart =
    displayStart.getTime() < backfillStart.getTime()
      ? displayStart
      : backfillStart;
  let rows = await loadStoredClicks(database, code, loadStart, now);
  rows = await fillMissingDimensions(
    database,
    code,
    rows,
    backfillStart,
    now,
    readEngine,
  );
  return analyticsFromStoredClicks(rows, range, now);
}

async function fillMissingDimensions(
  database: ClickStatementDatabase,
  code: string,
  rows: StoredClick[],
  since: Date,
  now: Date,
  readEngine?: (code: string, now: Date) => Promise<ImportedClick[] | null>,
) {
  const windowRows = rows.filter(
    (row) =>
      row.recorded_at >= since.getTime() && row.recorded_at < now.getTime(),
  );
  if (!needsDimensionBackfill(windowRows) || !readEngine) return rows;
  const imported = await readEngine(code, now);
  if (!imported) return rows;
  const updates = dimensionBackfill(windowRows, imported);
  if (!updates || updates.length === 0) return rows;
  try {
    await saveClickDimensions(database, updates);
  } catch (cause) {
    logger.info(
      { message: cause instanceof Error ? cause.message : "click dimensions" },
      "Saving click dimensions failed",
    );
    return rows;
  }
  return clicksWithDimensions(rows, updates);
}
