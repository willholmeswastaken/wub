import { db } from "@/server/db";
import { links } from "@/server/db/schema";
import logger from "@/server/logger";
import { LogClickEvent } from "@/server/qstash";
import { verifySignatureAppRouter } from "@upstash/qstash/dist/nextjs";
import { sql, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

async function handler(request: Request) {
    const data = await request.json() as LogClickEvent;

    logger.info({ short_code: data.short_code }, "Log click event received");

    const res = await db
        .update(links)
        .set({ click_count: sql`${links.click_count} + 1` })
        .where(eq(links.short_code, data.short_code))
        .returning({ click_count: links.click_count });

    if (res.length === 0) {
        logger.info({ short_code: data.short_code }, "Short link not found, cant update click count");
        return new NextResponse('Bad Request', { status: 400 });
    }

    logger.info({ short_code: data.short_code, new_click_count: res }, "Click count updated");

    return Response.json({ success: true });
}

// @ts-expect-error seems to be playing up.
export const POST = verifySignatureAppRouter(handler);
