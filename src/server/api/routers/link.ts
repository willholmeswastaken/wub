import { generateDateArrayFromDays } from "@/lib/click-date-range";
import { slugProblem, slugProblemMessage } from "@/lib/slug";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { type db } from "@/server/db";
import { clicks, links } from "@/server/db/schema";
import logger from "@/server/logger";
import { clientIp, protectRoute } from "@/server/rate-limit";
import { TRPCError, type inferRouterOutputs } from "@trpc/server";
import {
  type InferInsertModel,
  eq,
  inArray,
  and,
  isNotNull,
  isNull,
  gte,
  sql,
} from "drizzle-orm";
import { z } from "zod";

export const linkRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        url: z.string().url().max(2048),
        slug: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const rateLimited = await protectRoute(clientIp(ctx.headers));
      if (rateLimited) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Unable to process request",
        });
      }
      if (input.slug) {
        const problem = await findSlugProblem(ctx.db, input.slug);
        if (problem) {
          throw new TRPCError({
            code: problem === "taken" ? "CONFLICT" : "BAD_REQUEST",
            message: slugProblemMessage[problem],
          });
        }
      }
      return await createShortLink(
        ctx.db,
        input.url,
        ctx.session.user.id,
        input.slug,
      );
    }),
  checkSlug: protectedProcedure
    .input(z.string().max(64))
    .query(async ({ ctx, input }) => ({
      problem: await findSlugProblem(ctx.db, input),
    })),
  update: protectedProcedure
    .input(
      z.object({
        shortCode: z.string(),
        url: z.string().url().max(2048),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db
        .update(links)
        .set({ url: input.url })
        .where(
          and(
            eq(links.short_code, input.shortCode),
            eq(links.userId, ctx.session.user.id),
          ),
        )
        .returning({ short_code: links.short_code, url: links.url });
      if (updated.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
      }
      return updated[0]!;
    }),
  createAnon: publicProcedure
    .input(
      z.object({
        url: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const rateLimited = await protectRoute(clientIp(ctx.headers));
      if (rateLimited) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Unable to process request",
        });
      }
      return await createShortLink(ctx.db, input.url);
    }),

  getTempLinks: publicProcedure
    .input(z.array(z.string()))
    .query(async ({ ctx, input }) => {
      const rateLimited = await protectRoute(clientIp(ctx.headers));
      if (rateLimited) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Unable to process request",
        });
      }
      const tempLinks = await ctx.db.query.links.findMany({
        where: and(
          isNull(links.userId),
          and(inArray(links.short_code, input), isNotNull(links.expires_at)),
        ),
        columns: { short_code: true, click_count: true, expires_at: true },
      });
      return tempLinks;
    }),
  claim: protectedProcedure
    .input(
      z
        .array(
          z.object({
            shortCode: z.string().min(1),
            claimToken: z.string().min(1),
          }),
        )
        .max(100),
    )
    .mutation(async ({ ctx, input }) => {
      const claimed: string[] = [];
      for (const { shortCode, claimToken } of input) {
        const rows = await ctx.db
          .update(links)
          .set({
            userId: ctx.session.user.id,
            expires_at: null,
            claim_token: null,
          })
          .where(
            and(
              eq(links.short_code, shortCode),
              eq(links.claim_token, claimToken),
              isNull(links.userId),
            ),
          )
          .returning({ short_code: links.short_code });
        claimed.push(...rows.map((row) => row.short_code));
      }
      logger.info(
        { userId: ctx.session.user.id, claimed: claimed.length },
        "Guest links claimed",
      );
      return { claimed };
    }),
  getUserLinks: protectedProcedure.query(async ({ ctx }) => {
    const userLinks = await ctx.db.query.links.findMany({
      orderBy: (link, { desc }) => [desc(link.created_at)],
      where: eq(links.userId, ctx.session.user.id),
      columns: {
        short_code: true,
        url: true,
        created_at: true,
        click_count: true,
        last_clicked: true,
      },
    });
    if (userLinks.length === 0) return [];

    const days = lastNDayKeys(SPARKLINE_DAYS);
    const day = sql`date_trunc('day', ${clicks.timestamp})`;
    const dailyClicks = await ctx.db
      .select({
        short_code: clicks.short_code,
        day: sql<string>`to_char(${day}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(clicks)
      .innerJoin(links, eq(links.short_code, clicks.short_code))
      .where(
        and(
          eq(links.userId, ctx.session.user.id),
          gte(clicks.timestamp, new Date(`${days[0]}T00:00:00Z`)),
        ),
      )
      .groupBy(clicks.short_code, day);

    const byCode = new Map<string, Map<string, number>>();
    for (const row of dailyClicks) {
      const counts = byCode.get(row.short_code) ?? new Map<string, number>();
      counts.set(row.day, Number(row.count));
      byCode.set(row.short_code, counts);
    }

    return userLinks.map((link) => ({
      ...link,
      recentClicks: days.map(
        (key) => byCode.get(link.short_code)?.get(key) ?? 0,
      ),
    }));
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
      const totalClicks = await ctx.db.query.clicks.findMany({
        where: and(
          eq(clicks.short_code, input),
          gte(
            clicks.timestamp,
            new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
          ),
        ),
        columns: {
          timestamp: true,
          country: true,
          device: true,
          city: true,
          browser: true,
          os: true,
        },
      });
      const countClicks = totalClicks.reduce(
        (acc, click) => {
          if (click.country && click.country !== "unknown") {
            acc.countryClicks[click.country] =
              (acc.countryClicks[click.country] ?? 0) + 1;
          }

          if (click.city && click.city !== "unknown" && click.country) {
            if (!acc.cityClicks[click.city]) {
              acc.cityClicks[click.city] = {
                clicks: 1,
                country: click.country,
              };
            } else {
              acc.cityClicks[click.city]!.clicks++;
            }
          }

          if (click.device) {
            acc.deviceClicks[click.device] =
              (acc.deviceClicks[click.device] ?? 0) + 1;
          }

          if (click.browser) {
            acc.browserClicks[click.browser] =
              (acc.browserClicks[click.browser] ?? 0) + 1;
          }

          if (click.os) {
            acc.osClicks[click.os] = (acc.osClicks[click.os] ?? 0) + 1;
          }

          return acc;
        },
        {
          countryClicks: {},
          cityClicks: {},
          deviceClicks: {},
          browserClicks: {},
          osClicks: {},
        } as {
          countryClicks: Record<string, number>;
          cityClicks: Record<string, { clicks: number; country: string }>;
          deviceClicks: Record<string, number>;
          browserClicks: Record<string, number>;
          osClicks: Record<string, number>;
        },
      );
      return {
        link,
        clickRange: generateDateArrayFromDays(30, totalClicks),
        countClicks,
        totalClicks: totalClicks.length,
      };
    }),
});

const SPARKLINE_DAYS = 7;

function lastNDayKeys(count: number) {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (count - 1 - index));
    return date.toISOString().slice(0, 10);
  });
}

async function findSlugProblem(database: typeof db, slug: string) {
  const problem = slugProblem(slug);
  if (problem) return problem;
  const existing = await database.query.links.findFirst({
    where: eq(links.short_code, slug),
    columns: { short_code: true },
  });
  return existing ? ("taken" as const) : null;
}

async function createShortLink(
  database: typeof db,
  url: string,
  userId?: string,
  slug?: string,
): Promise<InferInsertModel<typeof links>> {
  const shortLinkLogger = logger.child({ url, userId });
  let unique = !!slug;
  let short_code = slug ?? "";

  while (!unique) {
    short_code = getShortcode();

    const existingLink = await database.query.links.findFirst({
      where: eq(links.short_code, short_code),
    });
    if (!existingLink) {
      unique = true;
      shortLinkLogger.info({ short_code }, "Unique short code found");
    }
  }
  const link = await database
    .insert(links)
    .values({
      url,
      short_code,
      expires_at: userId
        ? null
        : new Date(new Date().getTime() + 30 * 60 * 1000),
      claim_token: userId ? null : crypto.randomUUID(),
      userId,
    })
    .returning();

  shortLinkLogger.info({ short_code }, "Short link created in database");
  return link[0]!;
}

export type LinkRouterOutputs = inferRouterOutputs<typeof linkRouter>;

function getShortcode() {
  const characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const charactersLength = characters.length;
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
