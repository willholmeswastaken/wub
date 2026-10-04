import { generateDateArrayFromDays } from "@/lib/click-date-range";
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
      return await createShortLink(input.url, ctx.session.user.id);
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
      return ctx.db.listTempLinks(input);
    }),
  getUserLinks: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.listUserLinks(ctx.session.user.id);
  }),
  deleteLink: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      await ctx.db.deleteUserLink(input, ctx.session.user.id);
    }),
  getClicksFromLast30Days: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const link = await ctx.db.findLinkSnapshot(input);
      if (link?.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
      }
      const totalClicks = await ctx.db.listClicksSince(
        input,
        new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
      );
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

async function createShortLink(
  url: string,
  userId?: string,
): Promise<LinkRecord> {
  const shortLinkLogger = logger.child({ url, userId });
  let unique = false;
  let short_code = "";

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
