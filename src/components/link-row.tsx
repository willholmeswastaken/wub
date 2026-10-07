"use client";

import { ClickDelta } from "@/components/click-delta";
import { CopyButton } from "@/components/copy-button";
import { Sparkline } from "@/components/sparkline";
import { UrlFavicon } from "@/components/url-favicon";
import {
  formatWindowDelta,
  recentWindowTotals,
  windowDeltaCaption,
} from "@/lib/click-delta";
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
  layout = "compact",
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
  layout?: "compact" | "ledger";
}) {
  const ledger = layout === "ledger";
  const ledgerWeek = ledger && sparkline ? recentWindowTotals(sparkline) : null;
  const ledgerDelta = ledgerWeek
    ? formatWindowDelta(ledgerWeek.current, ledgerWeek.previous, {
        hideFlat: true,
      })
    : null;

  return (
    <div
      className={cn(
        "group relative transition-colors",
        ledger
          ? "flex items-center gap-4 px-1 py-4 md:grid md:grid-cols-[minmax(0,1fr)_13rem_5.5rem_6rem] md:items-center md:gap-x-8 md:rounded-2xl md:px-4 md:py-5"
          : "flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5",
        href && "hover:bg-muted/70",
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
      <div className="pointer-events-none relative flex min-w-0 flex-1 items-center gap-4">
        <UrlFavicon url={url} className={ledger ? "h-10 w-10" : undefined} />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              ledger
                ? "truncate text-base font-medium tracking-[-0.02em]"
                : "truncate text-sm font-medium tracking-[-0.01em]",
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
        <div
          className={cn(
            "pointer-events-none relative items-center justify-end gap-3",
            ledger ? "hidden md:flex" : "hidden sm:flex",
          )}
        >
          {ledgerWeek && (
            <span className="inline-flex w-[4.75rem] shrink-0 justify-end">
              {ledgerDelta && (
                <LedgerDelta
                  current={ledgerWeek.current}
                  previous={ledgerWeek.previous}
                  caption={windowDeltaCaption(ledgerWeek.window)}
                />
              )}
            </span>
          )}
          <Sparkline
            values={sparkline}
            width={ledger ? 112 : 56}
            height={ledger ? 32 : 20}
          />
        </div>
      )}
      <div
        className={cn(
          "pointer-events-none relative shrink-0 text-right",
          ledger ? "min-w-[4.75rem] md:w-auto md:min-w-0" : "w-12",
        )}
      >
        <p
          className={cn(
            "tabular-nums tracking-[-0.04em]",
            ledger
              ? "text-lg font-medium md:text-[1.65rem]"
              : "text-sm font-semibold",
          )}
        >
          {clicks.toLocaleString()}
        </p>
        <p
          className={cn("text-xs text-muted-foreground", ledger && "md:hidden")}
        >
          {ledgerDelta && ledgerWeek ? (
            <LedgerDelta
              current={ledgerWeek.current}
              previous={ledgerWeek.previous}
              caption={windowDeltaCaption(ledgerWeek.window)}
            />
          ) : clicks === 1 ? (
            "click"
          ) : (
            "clicks"
          )}
        </p>
      </div>
      <div className="relative z-10 flex items-center justify-end gap-1">
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

function LedgerDelta({
  current,
  previous,
  caption,
}: {
  current: number;
  previous: number;
  caption: string;
}) {
  return (
    <span className="inline-flex justify-end" title={caption}>
      <span className="sr-only">{caption}: </span>
      <ClickDelta
        current={current}
        previous={previous}
        hideFlat
        className="text-xs"
      />
    </span>
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
