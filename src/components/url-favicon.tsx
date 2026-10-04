"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import { Logo } from "./logo";

export function UrlFavicon({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = "";
  }

  return (
    <Avatar className={cn("h-8 w-8 rounded-lg", className)}>
      <AvatarImage
        src={
          hostname
            ? `https://icons.duckduckgo.com/ip3/${hostname}.ico`
            : undefined
        }
        alt=""
        className="dark:bg-white dark:p-0.5"
      />
      <AvatarFallback className="rounded-lg">
        <Logo />
      </AvatarFallback>
    </Avatar>
  );
}
