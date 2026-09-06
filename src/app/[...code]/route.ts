import { db } from "@/server/db";
import { links } from "@/server/db/schema";
import logger from "@/server/logger";
import { queueClient } from "@/server/qstash";
import { geolocation, ipAddress } from "@vercel/functions";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { type NextRequest, userAgent } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string[] }> },
) {
  const { code } = await params;
  const shortCode = code.join("/");
  const functionLogger = logger.child({ short_code: shortCode });
  functionLogger.info("Incoming short link request");

  const route = await db.query.links.findFirst({
    where: eq(links.short_code, shortCode),
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
    const geo = geolocation(request);

    await queueClient.logClick({
      short_code: shortCode,
      ipAddress: ipAddress(request) ?? "",
      userAgent: ua.ua,
      country: geo.country ?? "unknown",
      city: geo.city ?? "unknown",
      region: geo.countryRegion ?? "unknown",
      latitude: geo.latitude ?? "unknown",
      longitude: geo.longitude ?? "unknown",
      device: ua.device.type ?? "desktop",
      device_vendor: ua.device.vendor ?? "unknown",
      device_model: ua.device.model ?? "unknown",
      browser: ua.browser.name ?? "unknown",
      browser_version: ua.browser.version ?? "unknown",
      engine: ua.engine.name ?? "unknown",
      engine_version: ua.engine.version ?? "unknown",
      os: ua.os.name ?? "unknown",
      os_version: ua.os.version ?? "unknown",
      cpu_architecture: ua.cpu.architecture ?? "unknown",
    });
    functionLogger.info("Log click event sent");
  }

  functionLogger.info(
    { redirect_to: route.url },
    "Short link found redirecting to ",
  );
  redirect(route.url);
}
