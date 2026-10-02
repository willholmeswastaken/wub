"use client";

import { LinkRow } from "@/components/link-row";
import { cn } from "@/lib/utils";
import { LucideTimer, LucideTimerOff } from "lucide-react";
import { useEffect, useState } from "react";

function remainingMs(expiresAt: Date | string) {
  return new Date(expiresAt).getTime() - Date.now();
}

export function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function useCountdown(expiresAt?: Date | string | null) {
  const [remaining, setRemaining] = useState(() =>
    expiresAt ? remainingMs(expiresAt) : null,
  );

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setRemaining(remainingMs(expiresAt));
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt]);

  return remaining;
}

export default function ShortLink({
  url,
  clicks,
  shortUrl,
  expiresAt,
}: {
  url: string;
  clicks: number;
  shortUrl: string;
  expiresAt?: Date | string | null;
}) {
  const remaining = useCountdown(expiresAt);
  const isExpired = remaining !== null && remaining <= 0;
  const isEndingSoon =
    remaining !== null && remaining > 0 && remaining < 5 * 60_000;

  const expiryChip =
    remaining === null ? null : (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-foreground",
          isEndingSoon && "bg-amber-100 text-amber-900",
        )}
      >
        {isExpired ? (
          <>
            <LucideTimerOff className="h-3.5 w-3.5" />
            Expired
          </>
        ) : (
          <>
            <LucideTimer className="h-3.5 w-3.5" />
            {formatCountdown(remaining)}
          </>
        )}
      </span>
    );

  return (
    <LinkRow
      url={url}
      shortUrl={shortUrl}
      clicks={clicks}
      subtitle={url}
      isExpired={isExpired}
      accessory={expiryChip}
    />
  );
}
