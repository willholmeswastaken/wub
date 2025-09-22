import { env } from "@/env";
import { links } from "@/server/db/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import logger from "@/server/logger";
import { queueClient } from "@/server/qstash";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { type NextRequest, userAgent } from "next/server";
import * as schema from "@/server/db/schema";

export const dynamic = "force-dynamic";
export const runtime = "edge";

async function getDb() {
  const sql = neon(env.DATABASE_URL as string);
  return drizzle(sql, { schema, logger: true });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string}> },
) {
  const { code } = await params;
  const functionLogger = logger.child({ short_code: code });
  functionLogger.info("Incoming short link request");

  const db = await getDb();

  const route = await db.query.links.findFirst({
    where: eq(links.short_code, code.toString()),
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
    const headers = request.headers;
    const ipAddress =
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headers.get("x-real-ip") ??
      "unknown";

    await queueClient.logClick({
      short_code: code,
      ipAddress: ipAddress,
      userAgent: ua.ua,
      country: headers.get("x-vercel-ip-country") ?? "unknown",
      city: headers.get("x-vercel-ip-city") ?? "unknown",
      region: headers.get("x-vercel-ip-country-region") ?? "unknown",
      latitude: headers.get("x-vercel-ip-latitude") ?? "unknown",
      longitude: headers.get("x-vercel-ip-longitude") ?? "unknown",
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
