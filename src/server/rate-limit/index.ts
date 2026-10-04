import logger from "@/server/logger";

import { clientIp } from "./client-ip";
import { type RateLimitScope } from "./rate-limiter";
import { limitByIdentifier } from "./runtime";

export { clientIp };

export async function protectRoute(
  identifier: string | null,
  options?: { failOpen?: boolean; scope?: RateLimitScope },
) {
  const scope = options?.scope ?? "create";
  if (!identifier || identifier.length === 0) {
    if (options?.failOpen) return false;
    logger.info("No ip address found to protect route");
    return true;
  }
  try {
    const { success } = await limitByIdentifier(identifier, scope);
    if (!success) {
      logger.info({ scope }, "Rate limit exceeded");
      return true;
    }
    return false;
  } catch (error) {
    if (options?.failOpen) {
      logger.info(
        { message: error instanceof Error ? error.message : "unavailable" },
        "Rate limiter unavailable",
      );
      return false;
    }
    throw error;
  }
}

export function protectRedirect(identifier: string | null) {
  return protectRoute(identifier, { failOpen: true, scope: "redirect" });
}
