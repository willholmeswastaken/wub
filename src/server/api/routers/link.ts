import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { LinkService } from "@/server/domain/link-service";
import { runTrpc } from "@/server/run-app";
import { type inferRouterOutputs } from "@trpc/server";
import { Effect } from "effect";
import { z } from "zod";

export const linkRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
      }),
    )
    .mutation(({ ctx, input }) =>
      runTrpc(
        Effect.flatMap(LinkService, (service) =>
          service.create({
            url: input.url,
            userId: ctx.session.user.id,
            ip: ctx.headers.get("x-forwarded-for"),
          }),
        ),
      ),
    ),
  createAnon: publicProcedure
    .input(
      z.object({
        url: z.string().url(),
      }),
    )
    .mutation(({ ctx, input }) =>
      runTrpc(
        Effect.flatMap(LinkService, (service) =>
          service.create({
            url: input.url,
            ip: ctx.headers.get("x-forwarded-for"),
          }),
        ),
      ),
    ),
  getTempLinks: publicProcedure
    .input(z.array(z.string()))
    .query(({ ctx, input }) =>
      runTrpc(
        Effect.flatMap(LinkService, (service) =>
          service.getTempLinks({
            codes: input,
            ip: ctx.headers.get("x-forwarded-for"),
          }),
        ),
      ),
    ),
  getUserLinks: protectedProcedure.query(({ ctx }) =>
    runTrpc(
      Effect.flatMap(LinkService, (service) =>
        service.getUserLinks(ctx.session.user.id),
      ),
    ),
  ),
  deleteLink: protectedProcedure.input(z.string()).mutation(({ ctx, input }) =>
    runTrpc(
      Effect.flatMap(LinkService, (service) =>
        service.deleteLink({
          shortCode: input,
          userId: ctx.session.user.id,
        }),
      ),
    ),
  ),
  getClicksFromLast30Days: protectedProcedure
    .input(z.string())
    .query(({ ctx, input }) =>
      runTrpc(
        Effect.flatMap(LinkService, (service) =>
          service.getClicksFromLast30Days({
            shortCode: input,
            userId: ctx.session.user.id,
          }),
        ),
      ),
    ),
});

export type LinkRouterOutputs = inferRouterOutputs<typeof linkRouter>;
