"use client";

import { ClicksButton } from "@/components/clicks-button";
import { CopyButton } from "@/components/copy-button";
import { DeleteLink } from "@/components/delete-link";
import { QRCodeButton } from "@/components/qr-code-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getProjectUrl } from "@/lib/project-url";
import { EllipsisVertical, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { UrlFavicon } from "./url-favicon";

export function FullLinkCard({
  shortCode,
  url,
  clicks,
  createdAt,
}: {
  shortCode: string;
  url: string;
  clicks: number;
  createdAt: Date;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const formattedDate = createdAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  const shortUrl = `${getProjectUrl()}${shortCode}`;

  return (
    <article className="flex w-full flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <UrlFavicon url={url} />
        <div className="min-w-0">
          <Link
            href={`/analytics/${shortCode}`}
            className="block truncate text-sm font-semibold text-primary hover:underline"
          >
            {shortUrl}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {formattedDate} · {url}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <CopyButton text={shortUrl} />
        <QRCodeButton url={shortUrl} />
        <ClicksButton clicks={clicks} href={`/analytics/${shortCode}`} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Link actions"
            >
              <EllipsisVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40" align="end">
            <DropdownMenuItem
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
            >
              <Trash2Icon className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <DeleteLink
        isOpen={isDeleteDialogOpen}
        setIsOpen={setIsDeleteDialogOpen}
        shortCode={shortCode}
      />
    </article>
  );
}
