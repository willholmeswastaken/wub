"use client";

import { CopyButton } from "@/components/copy-button";
import { DeleteLink } from "@/components/delete-link";
import { iconButtonClassName } from "@/components/icon-button";
import { QRCodeButton } from "@/components/qr-code-button";
import { Trash2 } from "lucide-react";
import { useState } from "react";

export function LinkActions({
  shortUrl,
  shortCode,
}: {
  shortUrl: string;
  shortCode: string;
}) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <div className="flex items-start gap-8">
      <CopyButton text={shortUrl} labeled />
      <QRCodeButton url={shortUrl} />
      <button
        type="button"
        className="flex flex-col items-center gap-2"
        onClick={() => setIsDeleteOpen(true)}
      >
        <span className={iconButtonClassName("text-destructive")}>
          <Trash2 className="h-4 w-4" />
        </span>
        <span className="text-xs text-muted-foreground">Delete</span>
      </button>
      <DeleteLink
        shortCode={shortCode}
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
      />
    </div>
  );
}
