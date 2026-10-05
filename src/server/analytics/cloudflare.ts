import { type ClickRange } from "@/lib/click-date-range";
import { type ClickAnalytics } from "@/server/db/types";
import logger from "@/server/logger";
import { env as workersEnv } from "cloudflare:workers";

import { clickDataPoint, type ClickDataPoint } from "./datapoint";
import {
  analyticsFromEvents,
  clickEventsQuery,
  currentTotalQuery,
  isAnalyticsRetryable,
  previousTotalQuery,
  sparklineDayKey,
  sparklineQuery,
  type AnalyticsQuery,
  type ClickEventRow,
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

const RETRY_DELAYS_MS = [40, 80, 160];

async function runQuery<T>(request: AnalyticsQuery): Promise<T[]> {
  const binding = analyticsSql();
  if (!binding) {
    throw new Error("ANALYTICS binding is missing");
  }
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const result = await binding.query({
        query: request.query,
        params: { ...request.params },
      });
      return (result.data ?? []) as T[];
    } catch (cause) {
      lastError = cause;
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay == null || !isAnalyticsRetryable(cause)) break;
      logger.info(
        {
          message: cause instanceof Error ? cause.message : "analytics",
          attempt,
        },
        "Retrying analytics query",
      );
      await sleep(delay + Math.floor(Math.random() * 20));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Analytics query failed");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function countFrom(rows: { clicks: number | string | null }[]) {
  const total = Number(rows[0]?.clicks ?? 0);
  return Number.isFinite(total) ? total : 0;
}

export async function queryClickAnalytics(
  code: string,
  range: ClickRange,
  now = new Date(),
): Promise<ClickAnalytics> {
  let events: ClickEventRow[] | null = null;
  try {
    events = await runQuery<ClickEventRow>(clickEventsQuery(code, range, now));
  } catch (cause) {
    logger.info(
      { message: cause instanceof Error ? cause.message : "analytics" },
      "Analytics event query failed",
    );
  }
  const previousTotal = countFrom(
    await runQuerySafe<{ clicks: number | string | null }>(
      previousTotalQuery(code, range, now),
    ),
  );
  if (events) {
    return analyticsFromEvents(events, range, previousTotal);
  }
  // The event read failed after retries. A plain count still keeps the
  // headline from turning into a confident zero.
  const total = countFrom(
    await runQuerySafe<{ clicks: number | string | null }>(
      currentTotalQuery(code, range, now),
    ),
  );
  return {
    buckets: [],
    total,
    previousTotal,
    countries: [],
    cities: [],
    devices: [],
    browsers: [],
    os: [],
    referrers: [],
  };
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
