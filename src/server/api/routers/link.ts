import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { links } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";

// todo: Need to add rate limiting.

export const linkRouter = createTRPCRouter({
    create: protectedProcedure
    .input(z.object({ 
        url: z.string().url(),
     }))
    .mutation(async ({ ctx, input }) => {
      return await createShortLink(ctx.db, '', input.url, ctx.session.user.id);
    }),
    createAnon: publicProcedure
    .input(z.object({ 
        url: z.string().url(),
     }))
    .mutation(async ({ ctx, input }) => {
      return await createShortLink(ctx.db, '', input.url);
    }),
});

async function createShortLink(database: typeof db, short_code: string, url: string, userId?: string): Promise<string> {
    let unique = false;
      while(!unique) {
        short_code = getShortcode();
        const existingLink = await database.query.links.findFirst({
            where: eq(links.short_code, short_code)
        });
        if(!existingLink) {
            unique = true;
        }
      }
      await database.insert(links).values({
        url,
        short_code
      });

      return short_code;
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