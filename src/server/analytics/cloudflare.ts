import { type ClickRange } from "@/lib/click-date-range";
import { type ClickAnalytics } from "@/server/db/types";
import { env as workersEnv } from "cloudflare:workers";

import { clickDataPoint, type ClickDataPoint } from "./datapoint";
import {
  analyticsFromRows,
  clickAnalyticsQuery,
  previousTotalQuery,
  sparklineQuery,
  type AnalyticsQuery,
  type AnalyticsRow,
} from "./query";

type AnalyticsSql = {
  query(request: AnalyticsQuery): Promise<{ data: unknown[] }>;
};

type AnalyticsDataset = {
  writeDataPoint(event: ClickDataPoint): void;
};

function analyticsSql(): AnalyticsSql | null {
  const binding = (workersEnv as { ANALYTICS?: AnalyticsSql }).ANALYTICS;
  return binding ?? null;
}

export function writeClickDataPoint(
  event: Parameters<typeof clickDataPoint>[0],
) {
  const dataset = (workersEnv as { CLICK_ANALYTICS?: AnalyticsDataset })
    .CLICK_ANALYTICS;
  if (!dataset) return;
  dataset.writeDataPoint(clickDataPoint(event));
}

async function runQuery<T>(request: AnalyticsQuery): Promise<T[]> {
  const binding = analyticsSql();
  if (!binding) {
    throw new Error("ANALYTICS binding is missing");
  }
  const result = await binding.query(request);
  return result.data as T[];
}

export async function queryClickAnalytics(
  code: string,
  range: ClickRange,
  now = new Date(),
): Promise<ClickAnalytics> {
  const [rows, previous] = await Promise.all([
    runQuery<AnalyticsRow>(clickAnalyticsQuery(code, range, now)),
    runQuery<{ clicks: number | string | null }>(
      previousTotalQuery(code, range, now),
    ),
  ]);
  const previousTotal = Number(previous[0]?.clicks ?? 0);
  return analyticsFromRows(
    rows,
    Number.isFinite(previousTotal) ? previousTotal : 0,
  );
}

export async function querySparklineCounts(
  codes: readonly string[],
  since: Date,
) {
  if (codes.length === 0) return [];
  return runQuery<{
    short_code: string;
    day: string;
    clicks: number | string;
  }>(sparklineQuery(codes, since)).then((rows) =>
    rows.map((row) => ({
      short_code: row.short_code,
      day: row.day,
      count: Number(row.clicks) || 0,
    })),
  );
}
