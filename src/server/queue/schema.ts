import { z } from "zod";

export const logClickEventSchema = z.object({
  event_id: z.string().uuid(),
  short_code: z.string(),
  userAgent: z.string(),
  country: z.string(),
  city: z.string(),
  region: z.string(),
  latitude: z.string(),
  longitude: z.string(),
  device: z.string(),
  device_vendor: z.string(),
  device_model: z.string(),
  browser: z.string(),
  browser_version: z.string(),
  engine: z.string(),
  engine_version: z.string(),
  os: z.string(),
  os_version: z.string(),
  cpu_architecture: z.string(),
  referrer: z.string().optional(),
});

export type LogClickEvent = z.infer<typeof logClickEventSchema>;
