import logger from "@/server/logger";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});

/** Returns true when the request may proceed. Missing IPs are allowed. */
export async function isRateLimitAllowed(identifier: string | null) {
  if (!identifier || identifier.length === 0) {
    logger.info("No ip address found; allowing request");
    return true;
  }
  const { success } = await ratelimit.limit(identifier);
  if (!success) {
    logger.info({ identifier }, "Rate limit exceeded");
    return false;
  }
  return true;
}
