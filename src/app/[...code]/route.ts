import {
  buildClickEvent,
  readRequestCf,
  shortCodeFromParam,
} from "@/lib/click-request";
import { afterResponse } from "@/server/after-response";
import { getDatabaseProvider } from "@/server/db";
import { redirectDecision, trackClick } from "@/server/link-cache";
import logger from "@/server/logger";
import { publishClick } from "@/server/queue/runtime";
import { clientIp, protectRedirect } from "@/server/rate-limit";
import { lookupRedirect } from "@/server/redirect-lookup";
import { redirect } from "next/navigation";
import { type NextRequest, NextResponse, userAgent } from "next/server";

type VisitorRequest = NextRequest & {
  ip?: string;
  geo?: {
    city?: string;
    country?: string;
    region?: string;
    latitude?: string;
    longitude?: string;
  };
};

export const dynamic = "force-dynamic";

export async function GET(
  request: VisitorRequest,
  { params }: { params: Promise<{ code: string | string[] }> },
) {
  const code = shortCodeFromParam((await params).code);
  const functionLogger = logger.child({ short_code: code });

  if (await protectRedirect(clientIp(request.headers))) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  const decision = redirectDecision(await lookupRedirect(code));
  if (decision.kind === "missing") {
    functionLogger.info("Short link not found");
    redirect("/l/not-found");
  }
  if (decision.kind === "expired") {
    functionLogger.info("Short link expired");
    redirect("/l/expired");
  }

  const ua = userAgent(request);
  if (!ua.isBot) {
    const cf = readRequestCf(request);
    const event = buildClickEvent(code, {
      ip: request.ip,
      geo: request.geo,
      cf,
      userAgent: ua.ua,
      device: ua.device.type,
      deviceVendor: ua.device.vendor,
      deviceModel: ua.device.model,
      browser: ua.browser.name,
      browserVersion: ua.browser.version,
      engine: ua.engine.name,
      engineVersion: ua.engine.version,
      os: ua.os.name,
      osVersion: ua.os.version,
      cpuArchitecture: ua.cpu.architecture,
      referrer: request.headers.get("referer"),
    });
    afterResponse(() =>
      trackClick(
        () => publishClick(event),
        () => {
          if (getDatabaseProvider() !== "cloudflare") return;
          return import("@/server/analytics/cloudflare").then((mod) =>
            mod.writeClickDataPoint(event),
          );
        },
      ),
    );
  }

  functionLogger.info("Short link found");
  redirect(decision.url);
}
