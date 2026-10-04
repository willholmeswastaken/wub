import { slugProblemMessage } from "@/lib/slug";
import { z } from "zod";

export const destinationUrlSchema = z
  .string()
  .max(2048)
  .refine((value) => destinationUrlIssue(value) === null, "Enter a valid URL");

export function destinationUrlIssue(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "Enter a valid URL";
    }
    if (!url.hostname.includes(".")) return "Enter a valid URL";
    return null;
  } catch {
    return "Enter a valid URL";
  }
}

export function parseUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function validateDestinationUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return "Enter a URL";

  try {
    const url = new URL(parseUrl(trimmed));
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "Enter a valid URL";
    }
    if (!url.hostname.includes(".")) return "Enter a valid URL";
    return null;
  } catch {
    return "Enter a valid URL";
  }
}

export function hostnameOf(input: string): string | null {
  try {
    return new URL(parseUrl(input.trim())).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function shortenErrorMessage(error: unknown): string {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : "";
  if (Object.values(slugProblemMessage).includes(message)) return message;
  const normalized = message.toLowerCase();
  if (
    normalized.includes("too many") ||
    normalized.includes("unable to process")
  ) {
    return "Too many requests. Try again in a moment.";
  }
  if (normalized.includes("url")) return "Enter a valid URL";
  return "Could not shorten that URL. Try again.";
}
