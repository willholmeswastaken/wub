import { db } from "@/server/db";
import { clicks, links } from "@/server/db/schema";
import logger from "@/server/logger";
import { type LogClickEvent } from "@/server/qstash";
import { verifySignatureAppRouter } from "@upstash/qstash/dist/nextjs";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

async function handler(request: Request) {
  const data = (await request.json()) as LogClickEvent;
  const messageId =
    request.headers.get("upstash-message-id") ?? crypto.randomUUID();
  const functionLogger = logger.child({
    short_code: data.short_code,
    message_id: messageId,
  });

  functionLogger.info("Log click event received");

  const inserted = await db
    .insert(clicks)
    .values({
      short_code: data.short_code,
      message_id: messageId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      country: data.country,
      city: data.city,
      region: data.region,
      latitude: data.latitude,
      longitude: data.longitude,
      device: data.device,
      device_vendor: data.device_vendor,
      device_model: data.device_model,
      browser: data.browser,
      browser_version: data.browser_version,
      engine: data.engine,
      engine_version: data.engine_version,
      os: data.os,
      os_version: data.os_version,
      cpu_architecture: data.cpu_architecture,
    })
    .onConflictDoNothing({ target: clicks.message_id })
    .returning({ id: clicks.id });

  if (inserted.length === 0) {
    functionLogger.info("Duplicate click event ignored");
    return Response.json({ success: true, duplicate: true });
  }

  const res = await db
    .update(links)
    .set({
      click_count: sql`${links.click_count} + 1`,
      last_clicked: new Date(),
    })
    .where(eq(links.short_code, data.short_code))
    .returning({ click_count: links.click_count });

  if (res.length === 0) {
    logger.info("Short link not found, cant update click count");
    return new NextResponse("Bad Request", { status: 400 });
  }

  functionLogger.info({ new_click_count: res }, "Click recorded");

  return Response.json({ success: true });
}

export async function POST(request: Request) {
  return verifySignatureAppRouter(handler)(request);
}
