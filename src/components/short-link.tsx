"use client";

import { ClicksButton } from "@/components/clicks-button";
import { CopyButton } from "@/components/copy-button";
import { QRCodeButton } from "@/components/qr-code-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideTimer, LucideTimerOff } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { UrlFavicon } from "./url-favicon";

export default function ShortLink({
  url,
  clicks,
  shortUrl,
  expiresAt,
}: {
  url: string;
  clicks: number;
  shortUrl: string;
  expiresAt?: Date | null;
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

  return (
    <Card
      className={cn(
        "relative border-border text-left shadow-sm",
        isExpired && "text-muted-foreground line-through opacity-70",
      )}
    >
      <CardHeader className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3">
        <div className="flex items-center space-x-2">
          <UrlFavicon url={url} />
          <div className="relative flex flex-col items-start space-y-1">
            <div className="flex flex-row items-center space-x-1">
              <CardTitle className="text-sm">{shortUrl}</CardTitle>
              <CopyButton isExpired={isExpired} text={shortUrl} />
              <QRCodeButton url={shortUrl} />
            </div>
            <CardDescription className="text-xs">{url}</CardDescription>
          </div>
        </div>
        <div className="flex items-center">
          <ClicksButton clicks={clicks} />
        </div>
      </CardHeader>
      {expiresAt && (
        <div className="absolute top-0 right-4 -translate-y-1/2">
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground shadow-sm">
            {expiry === "Expired" ? (
              <LucideTimerOff className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <LucideTimer className="h-3.5 w-3.5" aria-hidden />
            )}
            {expiry === "Expired" ? "Expired" : `Expires in ${expiry}`}
          </span>
        </div>
      )}
      {expiresAt ? (
        <p className="px-4 pb-3 text-left text-xs text-muted-foreground">
          Guest links expire after 30 minutes.{" "}
          <Button asChild variant="link" className="h-auto px-0 text-xs">
            <Link href="/api/auth/signin">Create an account</Link>
          </Button>
        </p>
      ) : null}
    </Card>
  );
}
