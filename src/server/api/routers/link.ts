import { generateDateArrayFromDays } from "@/lib/click-date-range";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { type db } from "@/server/db";
import { clicks, links } from "@/server/db/schema";
import logger from "@/server/logger";
import { isRateLimitAllowed } from "@/server/rate-limit";
import { TRPCError, type inferRouterOutputs } from "@trpc/server";
import {
  type InferInsertModel,
  and,
  count,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  ne,
  sql,
} from "drizzle-orm";
import { z } from "zod";

const SHORT_CODE_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const MAX_SHORT_CODE_ATTEMPTS = 8;

async function assertRateLimit(ip: string | null) {
  const allowed = await isRateLimitAllowed(ip);
  if (!allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Unable to process request",
    });
  }
}

export const linkRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(ctx.headers.get("x-forwarded-for"));
      return await createShortLink(ctx.db, input.url, ctx.session.user.id);
    }),
  createAnon: publicProcedure
    .input(
      z.object({
        url: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(ctx.headers.get("x-forwarded-for"));
      return await createShortLink(ctx.db, input.url);
    }),

  getTempLinks: publicProcedure
    .input(z.array(z.string()))
    .query(async ({ ctx, input }) => {
      await assertRateLimit(ctx.headers.get("x-forwarded-for"));
      return await ctx.db.query.links.findMany({
        where: and(
          isNull(links.userId),
          inArray(links.short_code, input),
          isNotNull(links.expires_at),
        ),
      });
    }),
  getUserLinks: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.links.findMany({
      orderBy: (userLinks, { desc }) => [desc(userLinks.created_at)],
      where: eq(links.userId, ctx.session.user.id),
    });
  }),
  deleteLink: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(links)
        .where(
          and(
            eq(links.short_code, input),
            eq(links.userId, ctx.session.user.id),
          ),
        );
    }),
  getClicksFromLast30Days: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const link = await ctx.db.query.links.findFirst({
        where: eq(links.short_code, input),
        columns: {
          userId: true,
          url: true,
          short_code: true,
          created_at: true,
        },
      });
      if (link?.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
      }

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const inWindow = and(
        eq(clicks.short_code, input),
        gte(clicks.timestamp, since),
      );

      const [totalRow] = await ctx.db
        .select({ total: count() })
        .from(clicks)
        .where(inWindow);

      const countryRows = await ctx.db
        .select({
          country: clicks.country,
          clicks: count(),
        })
        .from(clicks)
        .where(
          and(
            inWindow,
            isNotNull(clicks.country),
            ne(clicks.country, "unknown"),
          ),
        )
        .groupBy(clicks.country);

      const cityRows = await ctx.db
        .select({
          city: clicks.city,
          country: clicks.country,
          clicks: count(),
        })
        .from(clicks)
        .where(
          and(
            inWindow,
            isNotNull(clicks.city),
            ne(clicks.city, "unknown"),
            isNotNull(clicks.country),
          ),
        )
        .groupBy(clicks.city, clicks.country);

      const deviceRows = await ctx.db
        .select({ device: clicks.device, clicks: count() })
        .from(clicks)
        .where(and(inWindow, isNotNull(clicks.device)))
        .groupBy(clicks.device);

      const browserRows = await ctx.db
        .select({ browser: clicks.browser, clicks: count() })
        .from(clicks)
        .where(and(inWindow, isNotNull(clicks.browser)))
        .groupBy(clicks.browser);

      const osRows = await ctx.db
        .select({ os: clicks.os, clicks: count() })
        .from(clicks)
        .where(and(inWindow, isNotNull(clicks.os)))
        .groupBy(clicks.os);

      const dailyRows = await ctx.db
        .select({
          day: sql<string>`to_char(${clicks.timestamp}, 'YYYY-MM-DD')`,
          clicks: count(),
        })
        .from(clicks)
        .where(inWindow)
        .groupBy(sql`to_char(${clicks.timestamp}, 'YYYY-MM-DD')`);

      const countryClicks: Record<string, number> = {};
      for (const row of countryRows) {
        if (row.country) countryClicks[row.country] = Number(row.clicks);
      }

      const cityClicks: Record<string, { clicks: number; country: string }> =
        {};
      for (const row of cityRows) {
        if (row.city && row.country) {
          cityClicks[row.city] = {
            clicks: Number(row.clicks),
            country: row.country,
          };
        }
      }

      const deviceClicks: Record<string, number> = {};
      for (const row of deviceRows) {
        if (row.device) deviceClicks[row.device] = Number(row.clicks);
      }

      const browserClicks: Record<string, number> = {};
      for (const row of browserRows) {
        if (row.browser) browserClicks[row.browser] = Number(row.clicks);
      }

      const osClicks: Record<string, number> = {};
      for (const row of osRows) {
        if (row.os) osClicks[row.os] = Number(row.clicks);
      }

      const clicksByDay: Record<string, number> = {};
      for (const row of dailyRows) {
        clicksByDay[row.day] = Number(row.clicks);
      }

      return {
        link,
        clickRange: generateDateArrayFromDays(30, clicksByDay),
        countClicks: {
          countryClicks,
          cityClicks,
          deviceClicks,
          browserClicks,
          osClicks,
        },
        totalClicks: Number(totalRow?.total ?? 0),
      };
    }),
});

async function createShortLink(
  database: typeof db,
  url: string,
  userId?: string,
): Promise<InferInsertModel<typeof links>> {
  const shortLinkLogger = logger.child({ url, userId });

  for (let attempt = 0; attempt < MAX_SHORT_CODE_ATTEMPTS; attempt++) {
    const short_code = getShortcode();
    try {
      const [link] = await database
        .insert(links)
        .values({
          url,
          short_code,
          expires_at: userId ? null : new Date(Date.now() + 30 * 60 * 1000),
          userId,
        })
        .returning();

      shortLinkLogger.info({ short_code }, "Short link created in database");
      return link!;
    } catch (error) {
      if (isUniqueViolation(error) && attempt < MAX_SHORT_CODE_ATTEMPTS - 1) {
        shortLinkLogger.info({ short_code }, "Short code collision, retrying");
        continue;
      }
      throw error;
    }
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Unable to allocate a unique short code",
  });
}

export type LinkRouterOutputs = inferRouterOutputs<typeof linkRouter>;

function getShortcode() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(
    bytes,
    (byte) => SHORT_CODE_CHARS[byte % SHORT_CODE_CHARS.length],
  ).join("");
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
