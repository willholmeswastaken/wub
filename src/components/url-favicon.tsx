"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Logo } from "./logo";

export function UrlFavicon({ url }: { url: string }) {
  const hostname = new URL(url).hostname;

  return (
    <Avatar className="h-6 w-6 rounded-md">
      <AvatarImage
        src={`https://icons.duckduckgo.com/ip3/${hostname}.ico`}
        alt={`${url} website logo`}
      />
      <AvatarFallback className="rounded-md">
        <Logo />
      </AvatarFallback>
    </Avatar>
  );
}
