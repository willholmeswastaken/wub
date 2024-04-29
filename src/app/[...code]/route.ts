import { db } from '@/server/db';
import { links } from '@/server/db/schema';
import { inngest } from '@/server/inngest/client';
import logger from '@/server/logger';
import { queueClient } from '@/server/qstash';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation'

export const dynamic = "force-dynamic";

export async function GET(
    request: Request,
    { params }: { params: { code: string } }
) {
    const getUrlLogger = logger.child({ short_code: params.code });
    getUrlLogger.info('Incoming short link request');

    const route = await db.query.links.findFirst({
        where: eq(links.short_code, params.code)
    });
    if (!route) {
        getUrlLogger.info('Short link not found');
        redirect('/')
    }

    await queueClient.logClick({ short_code: params.code });
    getUrlLogger.info('Log click event sent');

    getUrlLogger.info({ redirect_to: route.url }, 'Short link found redirecting to ');
    redirect(route.url)
}