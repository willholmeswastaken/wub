import { db } from '@/server/db';
import { links } from '@/server/db/schema';
import logger from '@/server/logger';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation'
 
export async function GET(
    request: Request,
  { params }: { params: { code: string } }
) {
    const getUrlLogger = logger.child({ short_code: params.code });
    getUrlLogger.info('Incoming short link request');
    const route = await db.query.links.findFirst({
        where: eq(links.short_code, params.code)
    });
    // todo: Fire a message to a queue, to update click count and to log an independent click row.
    if(!route) {
        getUrlLogger.info('Short link not found');
        redirect('/')
    }
    getUrlLogger.info({ redirect_to: route.url }, 'Short link found redirecting to ');
    redirect(route.url)
}