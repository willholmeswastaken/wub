import { env } from "@/env";

export function formatProjectUrl(
  host: string | undefined,
  includesProtocol = true,
  protocol?: string,
) {
  if (!host) return "/";
  if (!includesProtocol) return `${host}/`;

  const scheme = host.toLowerCase().includes("localhost")
    ? "http"
    : (protocol ?? "https");
  return `${scheme}://${host}/`;
}

export function projectUrlFromHeaders(
  headerList: Headers,
  includesProtocol = true,
) {
  const configured = env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
  if (configured) return formatProjectUrl(configured, includesProtocol);

  const forwardedHost = headerList
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost || headerList.get("host")?.trim() || undefined;
  const protocol = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return formatProjectUrl(host, includesProtocol, protocol);
}
