"use client";

import { CopyButton } from "@/components/copy-button";
import { Sparkline } from "@/components/sparkline";
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
  isHighlighted = false,
  initiallyCopied = false,
  accessory,
  sparkline,
  actions,
}: {
  url: string;
  shortUrl: string;
  clicks: number;
  subtitle: ReactNode;
  href?: string;
  isExpired?: boolean;
  isHighlighted?: boolean;
  initiallyCopied?: boolean;
  accessory?: ReactNode;
  sparkline?: number[];
  actions?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 px-4 py-3.5 transition-colors sm:gap-4 sm:px-5",
        href && "hover:bg-muted/50",
        isExpired && "text-muted-foreground",
        isHighlighted && "bg-brand/10 hover:bg-brand/10",
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
      <div className="pointer-events-none relative flex min-w-0 flex-1 items-center gap-3">
        <UrlFavicon url={url} />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm font-medium tracking-[-0.01em]",
              isExpired && "line-through",
            )}
          >
            <ShortUrlLabel shortUrl={shortUrl} />
          </p>
          <div className="mt-0.5 flex min-w-0 items-center gap-2">
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
      {sparkline && (
        <Sparkline
          values={sparkline}
          className="pointer-events-none relative hidden sm:block"
        />
      )}
      <div className="pointer-events-none relative w-12 shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums">
          {clicks.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">
          {clicks === 1 ? "click" : "clicks"}
        </p>
      </div>
      <div className="relative z-10 flex items-center gap-1">
        <CopyButton
          text={shortUrl}
          isExpired={isExpired}
          initiallyCopied={initiallyCopied}
        />
        {actions}
      </div>
    </div>
  );
}

function ShortUrlLabel({ shortUrl }: { shortUrl: string }) {
  const display = shortUrl.replace(/^https?:\/\//, "");
  const slash = display.indexOf("/");
  if (slash === -1) return display;
  return (
    <>
      <span className="hidden font-normal text-muted-foreground sm:inline">
        {display.slice(0, slash)}
      </span>
      {display.slice(slash)}
    </>
  );
}
