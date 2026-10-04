import { cn } from "@/lib/utils";
import { type ClassValue } from "clsx";

export function iconButtonClassName(className?: ClassValue) {
  return cn(
    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:w-9",
    className,
  );
}
