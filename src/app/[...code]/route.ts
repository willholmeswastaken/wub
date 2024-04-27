import { db } from '@/server/db';
import { links } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation'
 
export async function GET(
    request: Request,
  { params }: { params: { code: string } }
) {
    const route = await db.query.links.findFirst({
        where: eq(links.short_code, params.code)
    });
    if(!route) {
        redirect('/')
    }
  redirect(route.url)
}