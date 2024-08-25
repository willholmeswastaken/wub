"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { LucideTimer, LucideTimerOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { ClicksButton } from "@/components/clicks-button";
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

  console.log("expires at", expiresAt, url);

  return (
    <Card
      className={cn(
        "relative cursor-pointer border-gray-200 shadow-lg transition-[border-color] duration-75 hover:border-black",
        isExpired && "cursor-not-allowed text-gray-400 line-through",
      )}
    >
      <CardHeader className="grid grid-cols-[1fr,auto] gap-4 px-4 py-3">
        <div className="flex items-center space-x-2">
          <UrlFavicon url={url} />
          <div className="relative flex flex-col items-start space-y-1">
            <div className="flex flex-row items-center space-x-2">
              <CardTitle className="text-sm">{shortUrl}</CardTitle>
              <CopyButton isExpired={isExpired} text={shortUrl} />
            </div>
            <CardDescription className="text-xs">{url}</CardDescription>
          </div>
        </div>
        <div className="flex items-center">
          <ClicksButton clicks={clicks} />
        </div>
      </CardHeader>
      {expiresAt && (
        <Popover>
          <PopoverTrigger
            asChild
            onMouseEnter={(e) => e.currentTarget.click()}
            onMouseLeave={(e) => e.currentTarget.click()}
          >
            <div className="absolute right-14 top-0 -translate-y-1/2 translate-x-1/2">
              <span className="flex items-center space-x-1 whitespace-nowrap rounded-full border-gray-400 bg-gray-100 px-2 py-px text-xs font-medium text-gray-800 drop-shadow-lg">
                {expiry === "Expired" ? (
                  <>
                    <LucideTimerOff className="h-4 w-4" />
                    <p>Expired</p>
                  </>
                ) : (
                  <>
                    <LucideTimer className="h-4 w-4" />
                    <p>Expires in {expiry}</p>
                  </>
                )}
              </span>
            </div>
          </PopoverTrigger>
          <PopoverContent align="end" side="top" className="w-80">
            <div className="flex flex-col">
              <span className="text-sm">
                To prevent abuse of our systems we auto-disable guest created
                short links after 30 minutes. Just simply create an account
                below and create as many links as you wish!
              </span>
              <Button className="mt-2">Create an account</Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </Card>
  );
}
