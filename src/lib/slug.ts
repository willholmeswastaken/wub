export const SLUG_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;

export const RESERVED_SLUGS = new Set([
  "_next",
  "analytics",
  "api",
  "assets",
  "dashboard",
  "events",
  "favicon.ico",
  "l",
  "robots.txt",
  "signin",
  "signout",
]);

export type SlugProblem = "invalid" | "reserved" | "taken";

export function slugProblem(slug: string): SlugProblem | null {
  if (!SLUG_PATTERN.test(slug)) return "invalid";
  if (RESERVED_SLUGS.has(slug.toLowerCase())) return "reserved";
  return null;
}

export const slugProblemMessage: Record<SlugProblem, string> = {
  invalid: "Use 3 to 32 letters, numbers, dashes or underscores",
  reserved: "That word is reserved. Try another.",
  taken: "That short link is already taken",
};
