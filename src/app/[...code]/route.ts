import { db } from '@/server/db';
import { links } from '@/server/db/schema';
import logger from '@/server/logger';
import { queueClient } from '@/server/qstash';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation'

export const dynamic = "force-dynamic";

export async function GET(
    request: Request,
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

    await queueClient.logClick({
        short_code: params.code,
        ipAddress: request.headers.get('x-forwarded-for') ?? '',
        userAgent: request.headers.get('user-agent') ?? ''
    });
    functionLogger.info('Log click event sent');

    functionLogger.info({ redirect_to: route.url }, 'Short link found redirecting to ');
    redirect(route.url)
}