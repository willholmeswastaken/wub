import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { links } from "@/server/db/schema";
import { type InferInsertModel, eq, inArray, and, isNotNull } from "drizzle-orm";
import { type db } from "@/server/db";
import logger from "@/server/logger";
import { protectRoute } from "@/server/rate-limit";
import { TRPCError } from "@trpc/server";

export const linkRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      url: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rateLimited = await protectRoute(ctx.headers.get('x-forwarded-for'));
      if (rateLimited) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Unable to process request' });
      }
      return await createShortLink(ctx.db, input.url, ctx.session.user.id);
    }),
  createAnon: publicProcedure
    .input(z.object({
      url: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rateLimited = await protectRoute(ctx.headers.get('x-forwarded-for'));
      if (rateLimited) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Unable to process request' });
      }
      return await createShortLink(ctx.db, input.url);
    }),
  
  getTempLinks: publicProcedure
  .input(z.array(z.string()))
  .query(async ({ ctx, input }) => {
    const tempLinks = await ctx.db.query.links.findMany({
      where: and(inArray(links.short_code, input), isNotNull(links.expires_at))
    });
    return tempLinks;
  })
});

async function createShortLink(database: typeof db, url: string, userId?: string): Promise<InferInsertModel<typeof links>> {
  const shortLinkLogger = logger.child({ url, userId });
  let unique = false;
  let short_code = '';

  while (!unique) {
    short_code = getShortcode();

    const existingLink = await database.query.links.findFirst({
      where: eq(links.short_code, short_code)
    });
    if (!existingLink) {
      unique = true;
      shortLinkLogger.info({ short_code }, 'Unique short code found');
    }
  }
  const link = await database.insert(links).values({
    url,
    short_code,
    expires_at: userId ? null : new Date(new Date().getTime() + (30 * 60 * 1000))
  }).returning();

  shortLinkLogger.info({ short_code }, 'Short link created in database');
  return link[0]!;
}

function getShortcode() {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const charactersLength = characters.length;
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}