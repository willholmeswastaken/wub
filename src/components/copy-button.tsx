"use client";

import { cn } from "@/lib/utils";
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
      .catch((err) => {
        toast.error("Failed to copy link to clipboard");
        console.error(err);
      });
  };
  return (
    <button
      className={cn(
        "rounded-full bg-gray-100 p-1.5 transition-all duration-75 hover:scale-105 hover:bg-blue-200 active:scale-95",
        isExpired && "cursor-not-allowed",
      )}
      disabled={isExpired}
      onClick={onCopy}
    >
      <CopyIcon
        width={14}
        height={14}
        className="text-gray-700 transition-all group-hover:text-blue-800"
      />
    </button>
  );
}
