export function parseUrl(url: string) {
  return url.includes("http://") || url.includes("https://")
    ? url
    : `https://${url}`;
}
