import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { clicks, links } from "@/server/db/schema";
import { type InferInsertModel, eq, inArray, and, isNotNull, isNull, gte } from "drizzle-orm";
import { type db } from "@/server/db";
import logger from "@/server/logger";
import { protectRoute } from "@/server/rate-limit";
import { TRPCError, type inferRouterOutputs } from "@trpc/server";
import { generateDateArrayFromDays } from "@/lib/click-date-range";

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
      const rateLimited = await protectRoute(ctx.headers.get('x-forwarded-for'));
      if (rateLimited) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Unable to process request' });
      }
      const tempLinks = await ctx.db.query.links.findMany({
        where: and(isNull(links.userId), and(inArray(links.short_code, input), isNotNull(links.expires_at)))
      });
      return tempLinks;
    }),
  getUserLinks: protectedProcedure
    .query(async ({ ctx }) => {
      const userLinks = await ctx.db.query.links.findMany({
        orderBy: (links, { desc }) => [desc(links.created_at)],
        where: eq(links.userId, ctx.session.user.id)
      });
      return userLinks;
    }),
  deleteLink: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(links).where(and(eq(links.short_code, input), eq(links.userId, ctx.session.user.id)));
    }),
  getClicksFromLast30Days: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const totalClicks = await ctx.db.query.clicks.findMany({
        where: and(
          eq(clicks.short_code, input),
          gte(clicks.timestamp, new Date(new Date().getTime() - (30 * 24 * 60 * 60 * 1000)))
        ),
        columns: {
          timestamp: true
        }
      });
      return {
        clickRange: generateDateArrayFromDays(30, totalClicks),
        totalClicks: totalClicks.length
      };
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
    expires_at: userId ? null : new Date(new Date().getTime() + (30 * 60 * 1000)),
    userId
  }).returning();

  shortLinkLogger.info({ short_code }, 'Short link created in database');
  return link[0]!;
}

export type LinkRouterOutputs = inferRouterOutputs<typeof linkRouter>;

function getShortcode() {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const charactersLength = characters.length;
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}