import logger from "@/server/logger";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let ratelimit: Ratelimit | undefined;

function getRatelimit() {
  ratelimit ??= new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "10 s"),
    analytics: true,
    /**
     * Optional prefix for the keys used in redis. This is useful if you want to share a redis
     * instance with other applications and want to avoid key collisions. The default prefix is
     * "@upstash/ratelimit"
     */
    prefix: "@upstash/ratelimit",
  });
  return ratelimit;
}

export function clientIp(headers: Headers) {
  return headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for");
}

export async function protectRoute(identifier: string | null) {
  if (!identifier || identifier.length === 0) {
    logger.info("No ip address found to protect route");
    return true;
  }
  const { success } = await getRatelimit().limit(identifier);
  if (!success) {
    logger.info({ identifier }, "Rate limit exceeded");
    return true;
  }
  return false;
}
