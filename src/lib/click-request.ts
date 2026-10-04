import { type LogClickEvent } from "@/server/queue/schema";

type CfGeo = {
  country?: string | null;
  city?: string | null;
  region?: string | null;
  regionCode?: string | null;
  latitude?: string | null;
  longitude?: string | null;
};

type VisitorGeo = {
  city?: string | null;
  country?: string | null;
  region?: string | null;
  latitude?: string | null;
  longitude?: string | null;
};

export type ClickVisitor = {
  ip?: string | null;
  geo?: VisitorGeo | null;
  cf?: CfGeo | null;
  headers?: Headers;
  userAgent: string;
  device?: string | null;
  deviceVendor?: string | null;
  deviceModel?: string | null;
  browser?: string | null;
  browserVersion?: string | null;
  engine?: string | null;
  engineVersion?: string | null;
  os?: string | null;
  osVersion?: string | null;
  cpuArchitecture?: string | null;
  referrer?: string | null;
};

export function referrerHost(referrer: string | null | undefined) {
  if (!referrer) return "direct";
  try {
    return new URL(referrer).hostname.replace(/^www\./, "") || "direct";
  } catch {
    return "direct";
  }
}

function geoValue(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (value && value.length > 0) return value;
  }
  return "unknown";
}

export function readRequestCf(request: object): CfGeo | undefined {
  const cf = (request as { cf?: unknown }).cf;
  if (!cf || typeof cf !== "object") return undefined;
  return cf as CfGeo;
}

export function shortCodeFromParam(code: string | string[]) {
  return Array.isArray(code) ? code.join("/") : code;
}

export function buildClickEvent(
  code: string,
  visitor: ClickVisitor,
): LogClickEvent {
  const cf = readRequestCf(visitor);
  const geo = visitor.geo;

  return {
    short_code: code,
    ipAddress: geoValue(visitor.ip),
    userAgent: visitor.userAgent,
    country: geoValue(cf?.country, geo?.country),
    city: geoValue(cf?.city, geo?.city),
    region: geoValue(cf?.regionCode, cf?.region, geo?.region),
    latitude: geoValue(cf?.latitude, geo?.latitude),
    longitude: geoValue(cf?.longitude, geo?.longitude),
    device: visitor.device ?? "desktop",
    device_vendor: geoValue(visitor.deviceVendor),
    device_model: geoValue(visitor.deviceModel),
    browser: geoValue(visitor.browser),
    browser_version: geoValue(visitor.browserVersion),
    engine: geoValue(visitor.engine),
    engine_version: geoValue(visitor.engineVersion),
    os: geoValue(visitor.os),
    os_version: geoValue(visitor.osVersion),
    cpu_architecture: geoValue(visitor.cpuArchitecture),
    referrer: referrerHost(visitor.referrer),
  };
}
