import { env } from "@/env";
import { Client } from "@upstash/qstash";

export const qStashClient = new Client({ token: env.QSTASH_TOKEN });

export type LogClickEvent = {
    short_code: string;
    ipAddress: string;
    userAgent: string;
    country: string;
    city: string;
    region: string;
    latitude: string;
    longitude: string;
    device: string;
    device_vendor: string;
    device_model: string;
    browser: string;
    browser_version: string;
    engine: string;
    engine_version: string;
    os: string;
    os_version: string;
}

export const queueClient = {
    async logClick(event: LogClickEvent) {
        await qStashClient.publishJSON({
            topic: "wub.log_clicks",
            body: event
        });
    }
}
