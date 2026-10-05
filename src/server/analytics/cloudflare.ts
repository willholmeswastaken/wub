import { type ClickRange } from "@/lib/click-date-range";
import { type ClickAnalytics } from "@/server/db/types";
import logger from "@/server/logger";
import { env as workersEnv } from "cloudflare:workers";

import { clickDataPoint, type ClickDataPoint } from "./datapoint";
import {
  analyticsFromRows,
  clickAnalyticsQueries,
  previousTotalQuery,
  sparklineDayKey,
  sparklineQuery,
  toAnalyticsRows,
  type AnalyticsQuery,
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
  return (result.data ?? []) as T[];
}

async function runQuerySafe<T>(request: AnalyticsQuery): Promise<T[]> {
  try {
    return await runQuery<T>(request);
  } catch (cause) {
    logger.info(
      { message: cause instanceof Error ? cause.message : "analytics" },
      "Analytics query failed",
    );
    return [];
  }
}

export async function queryClickAnalytics(
  code: string,
  range: ClickRange,
  now = new Date(),
): Promise<ClickAnalytics> {
  const queries = clickAnalyticsQueries(code, range, now);
  const groups = [];
  for (const query of queries) {
    groups.push(
      toAnalyticsRows(
        query.kind,
        await runQuerySafe<Record<string, number | string | null>>(query),
      ),
    );
  }
  const previous = await runQuerySafe<{ clicks: number | string | null }>(
    previousTotalQuery(code, range, now),
  );
  const previousTotal = Number(previous[0]?.clicks ?? 0);
  return analyticsFromRows(
    groups.flat(),
    Number.isFinite(previousTotal) ? previousTotal : 0,
  );
}

const SPARKLINE_CODE_CHUNK = 40;

export async function querySparklineCounts(
  codes: readonly string[],
  since: Date,
) {
  if (codes.length === 0) return [];
  try {
    const groups = await Promise.all(
      chunk(codes, SPARKLINE_CODE_CHUNK).map((chunkCodes) =>
        runQuery<{
          short_code: string;
          bucket_day: number | string;
          clicks: number | string;
        }>(sparklineQuery(chunkCodes, since)),
      ),
    );
    return groups.flat().map((row) => ({
      short_code: row.short_code,
      day: sparklineDayKey(row.bucket_day),
      count: Number(row.clicks) || 0,
    }));
  } catch (cause) {
    // A sparkline is decoration on the links page. A missing dataset or a
    // rejected query must not turn /dashboard into an error page.
    logger.info(
      { message: cause instanceof Error ? cause.message : "sparkline" },
      "Sparkline query failed",
    );
    return [];
  }
}

function chunk<T>(items: readonly T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
