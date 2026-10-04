export function clientIp(headers: Headers) {
  const cloudflare = headers.get("cf-connecting-ip")?.trim();
  if (cloudflare) return cloudflare;
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const vercel = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  return vercel || null;
}
