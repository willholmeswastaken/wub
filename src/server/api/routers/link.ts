import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { links } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const linkRouter = createTRPCRouter({
    create: protectedProcedure
    .input(z.object({ 
        url: z.string().url(),
     }))
    .mutation(async ({ ctx, input }) => {
      let unique = false;
      let short_code = '';
      while(!unique) {
        short_code = getShortcode();
        const existingLink = await ctx.db.query.links.findFirst({
            where: eq(links.short_code, short_code)
        });
        if(!existingLink) {
            unique = true;
        }
      }
      await ctx.db.insert(links).values({
        url: input.url,
        userId: ctx.session.user.id,
        short_code
      });

      return short_code;
    }),
    createAnon: publicProcedure
    .input(z.object({ 
        url: z.string().url(),
     }))
    .mutation(async ({ ctx, input }) => {
      let unique = false;
      let short_code = '';
      while(!unique) {
        short_code = getShortcode();
        const existingLink = await ctx.db.query.links.findFirst({
            where: eq(links.short_code, short_code)
        });
        if(!existingLink) {
            unique = true;
        }
      }
      await ctx.db.insert(links).values({
        url: input.url,
        short_code
      });

      return short_code;
    }),
});

function getShortcode() {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const charactersLength = characters.length;
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}