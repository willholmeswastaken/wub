"use client";

import { EditLinkDialog } from "@/components/edit-link-dialog";
import { iconButtonClassName } from "@/components/icon-button";
import { QRCodeButton } from "@/components/qr-code-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useScheduleDelete } from "@/lib/pending-deletes";
import {
  BarChart3,
  MoreHorizontal,
  Pencil,
  QrCode,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function LinkRowMenu({
  shortCode,
  shortUrl,
  url,
}: {
  shortCode: string;
  shortUrl: string;
  url: string;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const scheduleDelete = useScheduleDelete();

  return (
    <>
      <QRCodeButton
        url={shortUrl}
        trigger={
          <button
            type="button"
            aria-label="Show QR code"
            className={iconButtonClassName(
              "hidden bg-transparent sm:inline-flex sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100",
            )}
          >
            <QrCode className="h-4 w-4" />
          </button>
        }
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="More actions"
          className={iconButtonClassName(
            "bg-transparent data-[state=open]:bg-accent",
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/analytics/${shortCode}`} className="cursor-pointer">
              <BarChart3 className="mr-2 h-4 w-4" />
              View analytics
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => setIsEditOpen(true)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit destination
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:text-destructive"
            onSelect={() =>
              scheduleDelete(shortCode, shortUrl.replace(/^https?:\/\//, ""))
            }
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditLinkDialog
        shortCode={shortCode}
        shortUrl={shortUrl}
        url={url}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
    </>
  );
}
