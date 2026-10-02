import logger from "@/server/logger";

import { limitByIdentifier } from "./runtime";

export function clientIp(headers: Headers) {
  return headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for");
}

export async function protectRoute(identifier: string | null) {
  if (!identifier || identifier.length === 0) {
    logger.info("No ip address found to protect route");
    return true;
  }
  const { success } = await limitByIdentifier(identifier);
  if (!success) {
    logger.info({ identifier }, "Rate limit exceeded");
    return true;
  }
  return false;
}
