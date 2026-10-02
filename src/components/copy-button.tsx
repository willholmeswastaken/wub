"use client";

import { iconButtonClassName } from "@/components/icon-button";
import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function CopyButton({
  isExpired,
  text,
  labeled = false,
  initiallyCopied = false,
}: {
  isExpired?: boolean;
  text: string;
  labeled?: boolean;
  initiallyCopied?: boolean;
}) {
  const [copied, setCopied] = useState(initiallyCopied);
  const timeoutRef = useRef<number | null>(null);

  const showCopied = () => {
    setCopied(true);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setCopied(false), 1000);
  };

  useEffect(() => {
    if (!initiallyCopied) return;
    timeoutRef.current = window.setTimeout(() => setCopied(false), 1000);
  }, [initiallyCopied]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const onCopy = () => {
    if (isExpired) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showCopied();
        toast.success("Link copied");
      })
      .catch(() => {
        toast.error("Could not copy that link");
      });
  };

  const button = (
    <button
      type="button"
      className={iconButtonClassName(
        copied && "bg-foreground text-background hover:bg-foreground",
      )}
      disabled={isExpired}
      aria-label={copied ? "Copied" : "Copy link"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onCopy();
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );

  if (!labeled) {
    return (
      <span className="inline-flex">
        {button}
        <span className="sr-only" aria-live="polite">
          {copied ? "Copied" : ""}
        </span>
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {button}
      <span className="text-xs text-muted-foreground" aria-live="polite">
        {copied ? "Copied" : "Copy"}
      </span>
    </div>
  );
}
