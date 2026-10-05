import { rangeStart } from "@/lib/click-date-range";
import { type ImportedClick } from "@/server/db/click-stats";
import logger from "@/server/logger";
import { env as workersEnv } from "cloudflare:workers";

import { clickDataPoint, type ClickDataPoint } from "./datapoint";
import {
  analyticsTimestamp,
  clickEventsQuery,
  isAnalyticsRetryable,
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

export async function readImportedClicks(
  code: string,
  now = new Date(),
): Promise<ImportedClick[] | null> {
  const since = rangeStart("90d", now);
  try {
    const rows = await runQuery<ClickEventRow>(
      clickEventsQuery(code, "90d", now),
    );
    return rows.flatMap((row) => importedClick(row, since, now));
  } catch (cause) {
    logger.info(
      { message: cause instanceof Error ? cause.message : "analytics" },
      "Analytics event query failed",
    );
    return null;
  }
}

function importedClick(
  row: ClickEventRow,
  since: Date,
  until: Date,
): ImportedClick[] {
  const record = row as Record<string, number | string | null | undefined>;
  const at = analyticsTimestamp(record.timestamp ?? record.Timestamp);
  if (!at) return [];
  const time = at.getTime();
  if (time < since.getTime() || time >= until.getTime()) return [];
  return [
    {
      at: time,
      country: textField(record, "country", "blob1"),
      city: textField(record, "city", "blob2"),
      device: textField(record, "device", "blob3"),
      browser: textField(record, "browser", "blob4"),
      os: textField(record, "os", "blob5"),
      referrer: textField(record, "referrer", "blob6"),
    },
  ];
}

function textField(
  row: Record<string, number | string | null | undefined>,
  name: string,
  fallback: string,
) {
  const value = row[name] ?? row[fallback];
  if (value == null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}
