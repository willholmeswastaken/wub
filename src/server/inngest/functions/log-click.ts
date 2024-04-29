import { db } from "@/server/db";
import { links } from "@/server/db/schema";
import { inngest } from "@/server/inngest/client";
import logger from "@/server/logger";
import { eq, sql } from "drizzle-orm";
import { NonRetriableError } from "inngest";

export type LogClickEvent = {
    data: {
        short_code: string;
    }
};

export const logClick = inngest.createFunction(
    { id: "log-click-event" },
    { event: "link/log-click" },
    async ({ event }) => {
        logger.info({ short_code: event.data.short_code }, "Log click event received");

        const res = await db
            .update(links)
            .set({ click_count: sql`${links.click_count} + 1` })
            .where(eq(links.short_code, event.data.short_code))
            .returning({ click_count: links.click_count });

        if (res.length === 0) {
            logger.info({ short_code: event.data.short_code }, "Short link not found, cant update click count");
            throw new NonRetriableError("Short link not found");
        }

        logger.info({ short_code: event.data.short_code, new_click_count: res }, "Click count updated");
        return { new_click_count: res }
    },
);
