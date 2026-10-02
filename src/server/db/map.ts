import { type ClickSummary, type LinkRecord, type LinkSnapshot } from "./types";

type LinkRow = {
  short_code: string;
  url: string;
  title: string | null;
  userId: string | null;
  created_at: Date | number;
  click_count: number;
  last_clicked: Date | number | null;
  expires_at: Date | number | null;
};

type ClickRow = {
  timestamp: Date | number | null;
  country: string | null;
  device: string | null;
  city: string | null;
  browser: string | null;
  os: string | null;
};

function asDate(value: Date | number): Date {
  return value instanceof Date ? value : new Date(value);
}

function asDateOrNull(value: Date | number | null): Date | null {
  if (value == null) return null;
  return asDate(value);
}

export function toLinkRecord(row: LinkRow): LinkRecord {
  return {
    short_code: row.short_code,
    url: row.url,
    title: row.title,
    userId: row.userId,
    created_at: asDate(row.created_at),
    click_count: row.click_count,
    last_clicked: asDateOrNull(row.last_clicked),
    expires_at: asDateOrNull(row.expires_at),
  };
}

export function toLinkSnapshot(row: LinkSnapshot): LinkSnapshot {
  return {
    ...row,
    created_at: asDate(row.created_at),
  };
}

export function toClickSummary(row: ClickRow): ClickSummary {
  return {
    timestamp: asDateOrNull(row.timestamp),
    country: row.country,
    device: row.device,
    city: row.city,
    browser: row.browser,
    os: row.os,
  };
}
