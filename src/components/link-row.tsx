"use client";

import { CopyButton } from "@/components/copy-button";
import { UrlFavicon } from "@/components/url-favicon";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { type ReactNode } from "react";

export function LinkRow({
  url,
  shortUrl,
  clicks,
  subtitle,
  href,
  isExpired = false,
  initiallyCopied = false,
  accessory,
}: {
  url: string;
  shortUrl: string;
  clicks: number;
  subtitle: ReactNode;
  href?: string;
  isExpired?: boolean;
  initiallyCopied?: boolean;
  accessory?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-4 px-4 py-4",
        href && "hover:bg-muted/60",
        isExpired && "text-muted-foreground",
      )}
    >
      {href && (
        <Link
          href={href}
          className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <span className="sr-only">View analytics for {shortUrl}</span>
        </Link>
      )}
      <div className="pointer-events-none relative flex min-w-0 flex-1 items-center gap-4">
        <UrlFavicon url={url} />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm font-semibold",
              isExpired && "line-through",
            )}
          >
            {shortUrl}
          </p>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            {accessory && (
              <div className="pointer-events-auto relative z-10 shrink-0">
                {accessory}
              </div>
            )}
            <div
              className={cn(
                "min-w-0 truncate text-sm text-muted-foreground",
                isExpired && "line-through",
              )}
            >
              {subtitle}
            </div>
          </div>
        </div>
      </div>
      <div className="pointer-events-none relative shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums">{clicks}</p>
        <p className="text-xs text-muted-foreground">clicks</p>
      </div>
      <div className="relative z-10">
        <CopyButton
          text={shortUrl}
          isExpired={isExpired}
          initiallyCopied={initiallyCopied}
        />
      </div>
    </div>
  );
}
