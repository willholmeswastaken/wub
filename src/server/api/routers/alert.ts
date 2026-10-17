import { env } from "@/env";
import { ALERT_TYPES } from "@/lib/alert-rules";
import { readUnsubscribeToken } from "@/server/alerts/unsubscribe-token";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError, type inferRouterOutputs } from "@trpc/server";
import { z } from "zod";

const ruleInput = z.object({
  shortCode: z.string().min(1).max(64),
  type: z.enum(ALERT_TYPES),
  threshold: z.number().int().min(1).max(1_000_000_000).optional(),
});

function requireRule<T>(
  result: { ok: true; rule: T } | { ok: false; reason: string },
): T {
  if (result.ok) return result.rule;
  if (result.reason === "not_found") {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "That link is not yours",
    });
  }
  throw new TRPCError({
    code: "CONFLICT",
    message: "That alert already exists for this link",
  });
}

export const alertRouter = createTRPCRouter({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.listAlerts(ctx.session.user.id),
  ),
  unreadCount: protectedProcedure.query(({ ctx }) =>
    ctx.db.unreadAlertCount(ctx.session.user.id),
  ),
  markRead: protectedProcedure
    .input(z.string().min(1))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.markAlertRead(input, ctx.session.user.id);
    }),
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.markAllAlertsRead(ctx.session.user.id);
  }),
  rules: protectedProcedure.query(({ ctx }) =>
    ctx.db.listAlertRules(ctx.session.user.id),
  ),
  create: protectedProcedure
    .input(ruleInput)
    .mutation(async ({ ctx, input }) => {
      if (input.type === "milestone" && input.threshold == null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Set the click total for this milestone",
        });
      }
      const result = await ctx.db.createAlertRule({
        id: crypto.randomUUID(),
        userId: ctx.session.user.id,
        shortCode: input.shortCode,
        type: input.type,
        threshold:
          input.type === "milestone" ? (input.threshold ?? null) : null,
      });
      return requireRule(result);
    }),
  pause: protectedProcedure
    .input(z.string().min(1))
    .mutation(async ({ ctx, input }) => {
      const rule = await ctx.db.pauseAlertRule(input, ctx.session.user.id);
      if (!rule) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found" });
      }
      return rule;
    }),
  resume: protectedProcedure
    .input(z.string().min(1))
    .mutation(async ({ ctx, input }) => {
      const rule = await ctx.db.resumeAlertRule(input, ctx.session.user.id);
      if (!rule) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found" });
      }
      return rule;
    }),
  reset: protectedProcedure
    .input(z.string().min(1))
    .mutation(async ({ ctx, input }) => {
      const rule = await ctx.db.resetAlertRule(input, ctx.session.user.id);
      if (!rule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Only a fired milestone can be reset",
        });
      }
      return rule;
    }),
  delete: protectedProcedure
    .input(z.string().min(1))
    .mutation(async ({ ctx, input }) => {
      const deleted = await ctx.db.deleteAlertRule(input, ctx.session.user.id);
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found" });
      }
    }),
  delivery: protectedProcedure.query(({ ctx }) =>
    ctx.db.getEmailDelivery(ctx.session.user.id),
  ),
  setEmailEnabled: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.db.setEmailEnabled(ctx.session.user.id, input.enabled),
    ),
  unsubscribe: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const secret = env.NEXTAUTH_SECRET;
      if (!secret) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unsubscribe is not configured",
        });
      }
      const userId = await readUnsubscribeToken(input.token, secret);
      if (!userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This unsubscribe link is not valid",
        });
      }
      await ctx.db.setEmailEnabled(userId, false);
      return { ok: true as const };
    }),
});

export type AlertRouterOutputs = inferRouterOutputs<typeof alertRouter>;
