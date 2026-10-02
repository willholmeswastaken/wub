import { env } from "@/env";

export function getProjectUrl(includesProtocol = true) {
  const host = env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
  if (!host) return "/";

  if (!includesProtocol) return `${host}/`;

  const protocol = host.toLowerCase().includes("localhost") ? "http" : "https";
  return `${protocol}://${host}/`;
}
