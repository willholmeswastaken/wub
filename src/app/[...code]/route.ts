import { isUaBot } from '@/lib/is-ua-bot';
import { db } from '@/server/db';
import { links } from '@/server/db/schema';
import logger from '@/server/logger';
import { queueClient } from '@/server/qstash';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation'
import { type NextRequest, userAgent } from 'next/server';

export const dynamic = "force-dynamic";

export async function GET(
    request: NextRequest,
    { params }: { params: { code: string } }
) {
    const functionLogger = logger.child({ short_code: params.code });
    functionLogger.info('Incoming short link request');

    const route = await db.query.links.findFirst({
        where: eq(links.short_code, params.code)
    });
    if (!route) {
        functionLogger.info('Short link not found');
        redirect('/')
    }
    if (route.expires_at && new Date() > route.expires_at) {
        functionLogger.info('Short link expired');
        redirect('/')
    }

    if (!isUaBot(request)) {
        const ua = userAgent(request);
        const geo = request.geo;
        console.log(ua);
        console.log(geo);
        await queueClient.logClick({
            short_code: params.code,
            ipAddress: request.ip ?? '',
            userAgent: ua.ua,
            country: geo?.country ?? 'unknown',
            city: geo?.city ?? 'unknown',
            region: geo?.region ?? 'unknown',
            latitude: geo?.latitude ?? 'unknown',
            longitude: geo?.longitude ?? 'unknown',
            device: ua.device.type ?? 'desktop',
            device_vendor: ua.device.vendor ?? 'unknown',
            device_model: ua.device.model ?? 'unknown',
            browser: ua.browser.name ?? 'unknown',
            browser_version: ua.browser.version ?? 'unknown',
            engine: ua.engine.name ?? 'unknown',
            engine_version: ua.engine.version ?? 'unknown',
            os: ua.os.name ?? 'unknown',
            os_version: ua.os.version ?? 'unknown'
        });
        functionLogger.info('Log click event sent');
    }

    functionLogger.info({ redirect_to: route.url }, 'Short link found redirecting to ');
    redirect(route.url)
}