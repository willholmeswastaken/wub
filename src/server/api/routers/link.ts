import {
  CLICK_RANGES,
  DEFAULT_CLICK_RANGE,
  generateClickBuckets,
  previousRangeStart,
  rangeStart,
} from "@/lib/click-date-range";
import { slugProblem, slugProblemMessage } from "@/lib/slug";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { findLinkByCode, insertLink, type LinkRecord } from "@/server/db";
import logger from "@/server/logger";
import { clientIp, protectRoute } from "@/server/rate-limit";
import { TRPCError, type inferRouterOutputs } from "@trpc/server";
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
        const problem = await findSlugProblem(input.slug);
        if (problem) {
          throw new TRPCError({
            code: problem === "taken" ? "CONFLICT" : "BAD_REQUEST",
            message: slugProblemMessage[problem],
          });
        }
      }
      return await createShortLink(input.url, ctx.session.user.id, input.slug);
    }),
  checkSlug: protectedProcedure
    .input(z.string().max(64))
    .query(async ({ input }) => ({
      problem: await findSlugProblem(input),
    })),
  update: protectedProcedure
    .input(
      z.object({
        shortCode: z.string(),
        url: z.string().url().max(2048),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.updateLinkUrl(
        input.shortCode,
        ctx.session.user.id,
        input.url,
      );
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
      }
      return updated;
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
      return await createShortLink(input.url);
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
      const tempLinks = await ctx.db.listTempLinks(input);
      return tempLinks.map(({ short_code, click_count, expires_at }) => ({
        short_code,
        click_count,
        expires_at,
      }));
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
      const claimed = await ctx.db.claimGuestLinks(ctx.session.user.id, input);
      logger.info(
        { userId: ctx.session.user.id, claimed: claimed.length },
        "Guest links claimed",
      );
      return { claimed };
    }),
  getUserLinks: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.listUserLinks(ctx.session.user.id);
  }),
  deleteLink: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      await ctx.db.deleteUserLink(input, ctx.session.user.id);
    }),
  getClicks: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        range: z.enum(CLICK_RANGES).default(DEFAULT_CLICK_RANGE),
      }),
    )
    .query(async ({ ctx, input }) => {
      const link = await ctx.db.findLinkSnapshot(input.code);
      if (!link || link.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
      }

      const now = new Date();
      const start = rangeStart(input.range, now);
      const periodClicks = await ctx.db.listClicksSince(input.code, start);
      const previousTotalClicks = await ctx.db.countClicksBetween(
        input.code,
        previousRangeStart(input.range, now),
        start,
      );

      const known = (value: string | null) =>
        value && value !== "unknown" ? value : null;
      const cityCountry = new Map<string, string>();
      for (const click of periodClicks) {
        if (known(click.city) && known(click.country)) {
          cityCountry.set(click.city!, click.country!);
        }
      }

      return {
        link: {
          url: link.url,
          short_code: link.short_code,
          created_at: link.created_at,
        },
        range: input.range,
        clickRange: generateClickBuckets(input.range, periodClicks, now),
        totalClicks: periodClicks.length,
        previousTotalClicks,
        breakdown: {
          countries: tally(periodClicks.map((click) => known(click.country))),
          cities: tally(periodClicks.map((click) => known(click.city))).map(
            (item) => ({ ...item, country: cityCountry.get(item.key) ?? "" }),
          ),
          devices: tally(periodClicks.map((click) => click.device)),
          browsers: tally(periodClicks.map((click) => known(click.browser))),
          os: tally(periodClicks.map((click) => known(click.os))),
          referrers: tally(
            periodClicks.map((click) => click.referrer ?? "direct"),
          ),
        },
      };
    }),
});

function tally(values: Array<string | null>) {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

async function findSlugProblem(slug: string) {
  const problem = slugProblem(slug);
  if (problem) return problem;
  const existing = await findLinkByCode(slug);
  return existing ? ("taken" as const) : null;
}

async function createShortLink(
  url: string,
  userId?: string,
  slug?: string,
): Promise<LinkRecord> {
  const shortLinkLogger = logger.child({ url, userId });
  let unique = !!slug;
  let short_code = slug ?? "";

  while (!unique) {
    short_code = getShortcode();

    const existingLink = await findLinkByCode(short_code);
    if (!existingLink) {
      unique = true;
      shortLinkLogger.info({ short_code }, "Unique short code found");
    }
  }
  const link = await insertLink({
    url,
    short_code,
    expires_at: userId ? null : new Date(new Date().getTime() + 30 * 60 * 1000),
    claim_token: userId ? null : crypto.randomUUID(),
    userId,
  });

  shortLinkLogger.info({ short_code }, "Short link created in database");
  return link;
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
