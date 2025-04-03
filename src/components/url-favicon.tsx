"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@radix-ui/react-avatar";
import { Logo } from "./logo";

export function UrlFavicon({ url }: { url: string }) {
  const hostname = new URL(url).hostname;

  return (
    <Avatar className="h-6 w-6">
      <AvatarImage
        src={`https://icons.duckduckgo.com/ip3/${hostname}.ico`}
        alt={`${url} website logo`}
      />
      <AvatarFallback>
        <Logo />
      </AvatarFallback>
    </Avatar>
  );
}
