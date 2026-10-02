"use client";

import { LinkRow } from "@/components/link-row";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LucideTimer, LucideTimerOff } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function ShortLink({
  url,
  clicks,
  shortUrl,
  expiresAt,
  initiallyCopied = false,
}: {
  url: string;
  clicks: number;
  shortUrl: string;
  expiresAt?: Date | null;
  initiallyCopied?: boolean;
}) {
  const isExpired = !!expiresAt && new Date(expiresAt) < new Date();

  const calculateExpiry = useCallback(() => {
    if (!expiresAt) return;
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    if (diff <= 0) {
      return "Expired";
    }
    const minutes = Math.floor(diff / 1000 / 60);
    return `${minutes}m`;
  }, [expiresAt]);

  const [expiry, setExpiry] = useState(calculateExpiry());

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      setExpiry(calculateExpiry());
    }, 1000);
    return () => clearInterval(interval);
  }, [calculateExpiry, expiresAt]);

  const expiryChip = expiresAt ? (
    <Popover>
      <PopoverTrigger className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {expiry === "Expired" ? (
          <>
            <LucideTimerOff className="h-4 w-4" />
            <span>Expired</span>
          </>
        ) : (
          <>
            <LucideTimer className="h-4 w-4" />
            <span>Expires in {expiry}</span>
          </>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-80 rounded-2xl">
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            To prevent abuse of our systems we auto-disable guest created short
            links after 30 minutes. Create an account and make as many links as
            you want.
          </p>
          <Button asChild className="w-full">
            <Link href="/api/auth/signin">Create an account</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  ) : null;

  return (
    <LinkRow
      url={url}
      shortUrl={shortUrl}
      clicks={clicks}
      subtitle={url}
      isExpired={isExpired}
      initiallyCopied={initiallyCopied}
      accessory={expiryChip}
    />
  );
}
