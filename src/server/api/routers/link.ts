import {
  CLICK_RANGES,
  DEFAULT_CLICK_RANGE,
  fillClickBuckets,
} from "@/lib/click-date-range";
import { getShortcode } from "@/lib/short-code";
import { slugProblem, slugProblemMessage } from "@/lib/slug";
import { destinationUrlSchema } from "@/lib/url";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { findLinkByCode, insertLink, type LinkRecord } from "@/server/db";
import { isLinkConflictError } from "@/server/db/conflicts";
import logger from "@/server/logger";
import { clientIp, protectRoute } from "@/server/rate-limit";
import { TRPCError, type inferRouterOutputs } from "@trpc/server";
import { z } from "zod";

export const linkRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        url: destinationUrlSchema,
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
        const problem = slugProblem(input.slug);
        if (problem) {
          throw new TRPCError({
            code: "BAD_REQUEST",
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
        url: destinationUrlSchema,
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
        url: destinationUrlSchema,
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
    .input(z.array(z.string()).max(100))
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

      const analytics = await ctx.db.clickAnalytics(input.code, input.range);

      return {
        link: {
          url: link.url,
          short_code: link.short_code,
          created_at: link.created_at,
        },
        range: input.range,
        clickRange: fillClickBuckets(input.range, analytics.buckets),
        totalClicks: analytics.total,
        previousTotalClicks: analytics.previousTotal,
        breakdown: {
          countries: analytics.countries,
          cities: analytics.cities,
          devices: analytics.devices,
          browsers: analytics.browsers,
          os: analytics.os,
          referrers: analytics.referrers,
        },
      };
    }),
});

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
  const shortLinkLogger = logger.child({ userId });
  const expires_at = userId ? null : new Date(Date.now() + 30 * 60 * 1000);
  const claim_token = userId ? null : crypto.randomUUID();

  for (let attempt = 0; attempt < 5; attempt++) {
    const short_code = slug ?? getShortcode();
    try {
      const link = await insertLink({
        url,
        short_code,
        expires_at,
        claim_token,
        userId,
      });
      shortLinkLogger.info({ short_code }, "Short link created in database");
      return link;
    } catch (error) {
      if (!isLinkConflictError(error)) throw error;
      if (slug) {
        throw new TRPCError({
          code: "CONFLICT",
          message: slugProblemMessage.taken,
        });
      }
    }
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Could not allocate a short code",
  });
}

export type LinkRouterOutputs = inferRouterOutputs<typeof linkRouter>;
