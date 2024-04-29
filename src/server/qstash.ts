import { env } from "@/env";
import { Client } from "@upstash/qstash";

export const qStashClient = new Client({ token: env.QSTASH_TOKEN });

export type LogClickEvent = {
    short_code: string;
    ipAddress: string;
    userAgent: string;
}

export const queueClient = {
    async logClick(event: LogClickEvent) {
        await qStashClient.publishJSON({
            topic: "wub.log_clicks",
            body: event
        });
    }
}
