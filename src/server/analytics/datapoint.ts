import { type LogClickEvent } from "@/server/queue/schema";

export const CLICK_BLOB_FIELDS = [
  "country",
  "city",
  "device",
  "browser",
  "os",
  "referrer",
] as const;

export type ClickDataPoint = {
  indexes: string[];
  doubles: number[];
  blobs: string[];
};

export function clickDataPoint(event: LogClickEvent): ClickDataPoint {
  return {
    indexes: [event.short_code],
    doubles: [1],
    blobs: [
      event.country,
      event.city,
      event.device,
      event.browser,
      event.os,
      event.referrer ?? "direct",
    ],
  };
}
