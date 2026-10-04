"use client";

import { QRCodeButton } from "@/components/qr-code-button";
import { Button } from "@/components/ui/button";
import { UrlFavicon } from "@/components/url-favicon";
import { copyToClipboard } from "@/lib/clipboard";
import { motion } from "framer-motion";
import { Check, Copy, ExternalLink, QrCode, Share2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

function displayUrl(url: string) {
  return url.replace(/^https?:\/\//, "");
}

export function LinkResultCard({
  shortUrl,
  url,
  autoCopied,
  footer,
}: {
  shortUrl: string;
  url: string;
  autoCopied: boolean;
  footer?: ReactNode;
}) {
  const [copied, setCopied] = useState(autoCopied);
  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!copied) return;
    timeoutRef.current = window.setTimeout(() => setCopied(false), 2500);
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [copied]);

  const onCopy = async () => {
    if (await copyToClipboard(shortUrl)) {
      setCopied(true);
    } else {
      toast.error("Could not copy that link");
    }
  };

  const onShare = () => {
    navigator.share({ url: shortUrl }).catch(() => undefined);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="slip w-full overflow-hidden text-left"
    >
      <div className="p-5">
        <p
          className="flex items-center gap-1.5 text-sm text-muted-foreground"
          aria-live="polite"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-brand" />
              Copied to clipboard
            </>
          ) : (
            "Your short link is ready"
          )}
        </p>
        <button
          type="button"
          onClick={() => void onCopy()}
          className="mt-2 block max-w-full break-all text-left font-display text-3xl font-medium italic leading-none tracking-tight hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-4xl"
        >
          {displayUrl(shortUrl)}
        </button>
        <div className="mt-2 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <UrlFavicon url={url} className="h-4 w-4 rounded" />
          <span className="truncate">{url}</span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => void onCopy()} className="min-w-28">
            {copied ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <QRCodeButton
            url={shortUrl}
            trigger={
              <Button variant="outline">
                <QrCode className="mr-2 h-4 w-4" />
                QR code
              </Button>
            }
          />
          {canShare && (
            <Button variant="outline" onClick={onShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          )}
          <Button variant="ghost" asChild>
            <a href={shortUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open
            </a>
          </Button>
        </div>
      </div>
      {footer}
    </motion.div>
  );
}
