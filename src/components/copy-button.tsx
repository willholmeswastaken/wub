"use client";

import { Button } from "@/components/ui/button";
import { CopyIcon } from "lucide-react";
import { toast } from "sonner";

export function CopyButton({
  isExpired,
  text,
}: {
  isExpired?: boolean;
  text: string;
}) {
  const onCopy = () => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success("Link copied to clipboard");
      })
      .catch(() => {
        toast.error("Failed to copy link to clipboard");
      });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      disabled={isExpired}
      aria-label="Copy short link"
      onClick={onCopy}
    >
      <CopyIcon className="h-4 w-4" />
    </Button>
  );
}
