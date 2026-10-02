import {
  buildClickEvent,
  readRequestCf,
  shortCodeFromParam,
} from "@/lib/click-request";
import { db } from "@/server/db";
import { links } from "@/server/db/schema";
import logger from "@/server/logger";
import { publishClick } from "@/server/queue/runtime";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { type NextRequest, userAgent } from "next/server";

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
  functionLogger.info("Incoming short link request");

  const route = await db.query.links.findFirst({
    where: eq(links.short_code, code),
  });
  if (!route) {
    functionLogger.info("Short link not found");
    redirect("/");
  }
  if (route.expires_at && new Date() > route.expires_at) {
    functionLogger.info("Short link expired");
    redirect("/");
  }

  const ua = userAgent(request);
  if (!ua.isBot) {
    const cf = readRequestCf(request);

    await publishClick(
      buildClickEvent(code, {
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
      }),
    );
    functionLogger.info("Log click event sent");
  }

  functionLogger.info(
    { redirect_to: route.url },
    "Short link found redirecting to ",
  );
  redirect(route.url);
}
