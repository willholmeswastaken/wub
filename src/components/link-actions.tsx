"use client";

import { CopyButton } from "@/components/copy-button";
import { EditLinkDialog } from "@/components/edit-link-dialog";
import { iconButtonClassName } from "@/components/icon-button";
import { QRCodeButton } from "@/components/qr-code-button";
import { useScheduleDelete } from "@/lib/pending-deletes";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LinkActions({
  shortUrl,
  shortCode,
  url,
}: {
  shortUrl: string;
  shortCode: string;
  url: string;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const scheduleDelete = useScheduleDelete();
  const router = useRouter();

  return (
    <div className="flex items-start gap-5">
      <CopyButton text={shortUrl} labeled />
      <QRCodeButton url={shortUrl} />
      <button
        type="button"
        className="flex flex-col items-center gap-2"
        onClick={() => setIsEditOpen(true)}
      >
        <span className={iconButtonClassName()}>
          <Pencil className="h-4 w-4" />
        </span>
        <span className="text-xs text-muted-foreground">Edit</span>
      </button>
      <button
        type="button"
        className="flex flex-col items-center gap-2"
        onClick={() => {
          scheduleDelete(shortCode, shortUrl.replace(/^https?:\/\//, ""));
          router.push("/dashboard");
        }}
      >
        <span className={iconButtonClassName("text-destructive")}>
          <Trash2 className="h-4 w-4" />
        </span>
        <span className="text-xs text-muted-foreground">Delete</span>
      </button>
      <EditLinkDialog
        shortCode={shortCode}
        shortUrl={shortUrl}
        url={url}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
    </div>
  );
}
