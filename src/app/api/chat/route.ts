import { getProjectUrl } from "@/lib/project-url";
import { createShortLink } from "@/server/api/routers/link";
import { db } from "@/server/db";
import { clicks, links } from "@/server/db/schema";
import { getServerAuthSession } from "@/server/auth";
import { xai } from "@ai-sdk/xai";
import {
  streamText,
  type UIMessage,
  convertToModelMessages,
  tool,
  stepCountIs,
} from "ai";
import { eq, and, gte } from "drizzle-orm";
import { z } from "zod";

export const maxDuration = 30;

export async function POST(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Get user session for authentication
  const session = await getServerAuthSession();

  const result = streamText({
    model: xai("grok-4-fast-non-reasoning"),
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(3),
    tools: {
      createLink: tool({
        description: "Create a short link from a URL",
        inputSchema: z.object({
          url: z.url().describe("The URL to shorten"),
          title: z.string().optional().describe("Optional title for the link"),
          expiresIn: z.number().optional().describe("Expiration time in hours"),
        }),
        execute: async ({ url, title, expiresIn }) => {
          const link = await createShortLink(db, url, session?.user?.id);

          if (title) {
            await db
              .update(links)
              .set({ title: title })
              .where(eq(links.short_code, link.short_code));
          }

          if (expiresIn) {
            const expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000);
            await db
              .update(links)
              .set({ expires_at: expiresAt })
              .where(eq(links.short_code, link.short_code));
          }

          return {
            shortUrl: `${getProjectUrl()}${link.short_code}`,
            originalUrl: url,
            shortCode: link.short_code,
            createdAt: link.created_at,
          };
        },
      }),
      getLinkPerformance: tool({
        description: "Get performance analytics for a short link",
        inputSchema: z.object({
          shortCodeOrUrl: z.string().describe("The short code (e.g., 'abc12345') or full short URL (e.g., 'https://wub.com/abc12345')"),
        }),
        execute: async ({ shortCodeOrUrl }) => {
          let shortCode = shortCodeOrUrl;
          if (shortCodeOrUrl.includes('/')) {
            const urlParts = shortCodeOrUrl.split('/');
            shortCode = urlParts[urlParts.length - 1] ?? shortCodeOrUrl;
          }

          const link = await db.query.links.findFirst({
            where: eq(links.short_code, shortCode),
            columns: {
              url: true,
              short_code: true,
              created_at: true,
              title: true,
              click_count: true,
              userId: true,
            },
          });

          if (!link) {
            throw new Error(`Link with code "${shortCode}" not found`);
          }

          // Check authentication and ownership
          const isAuthenticated = !!session?.user?.id;
          const isOwner = link.userId === session?.user?.id;

          // Allow access if:
          // 1. Link is anonymous (no userId), OR
          // 2. User is authenticated and owns the link
          if (link.userId && (!isAuthenticated || !isOwner)) {
            if (!isAuthenticated) {
              throw new Error(`This link requires authentication to view analytics. Please log in to access your personal link analytics.`);
            } else {
              throw new Error(`You don't have permission to view analytics for this link.`);
            }
          }

          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const totalClicks = await db.query.clicks.findMany({
            where: and(
              eq(clicks.short_code, shortCode),
              gte(clicks.timestamp, thirtyDaysAgo)
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

          const analytics = totalClicks.reduce(
            (acc, click) => {
              if (click.country && click.country !== "unknown") {
                acc.countryClicks[click.country] = (acc.countryClicks[click.country] ?? 0) + 1;
              }

              if (click.city && click.city !== "unknown") {
                acc.cityClicks[click.city] = (acc.cityClicks[click.city] ?? 0) + 1;
              }

              if (click.device) {
                acc.deviceClicks[click.device] = (acc.deviceClicks[click.device] ?? 0) + 1;
              }

              if (click.browser) {
                acc.browserClicks[click.browser] = (acc.browserClicks[click.browser] ?? 0) + 1;
              }

              if (click.os) {
                acc.osClicks[click.os] = (acc.osClicks[click.os] ?? 0) + 1;
              }

              return acc;
            },
            {
              countryClicks: {} as Record<string, number>,
              cityClicks: {} as Record<string, number>,
              deviceClicks: {} as Record<string, number>,
              browserClicks: {} as Record<string, number>,
              osClicks: {} as Record<string, number>,
            }
          );

          const topCountries = Object.entries(analytics.countryClicks)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([country, clicks]) => ({ country, clicks }));

          const topCities = Object.entries(analytics.cityClicks)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([city, clicks]) => ({ city, clicks }));

          const topDevices = Object.entries(analytics.deviceClicks)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([device, clicks]) => ({ device, clicks }));

          const topBrowsers = Object.entries(analytics.browserClicks)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([browser, clicks]) => ({ browser, clicks }));

          const topOS = Object.entries(analytics.osClicks)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([os, clicks]) => ({ os, clicks }));

          return {
            link: {
              shortUrl: `${getProjectUrl()}${link.short_code}`,
              originalUrl: link.url,
              title: link.title,
              createdAt: link.created_at,
              totalClicksAllTime: link.click_count,
            },
            last30Days: {
              totalClicks: totalClicks.length,
              topCountries,
              topCities,
              topDevices,
              topBrowsers,
              topOS,
            },
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
