"use client";

import { CopyButton } from "@/components/copy-button";
import { ClicksButton } from "@/components/clicks-button";
import { QRCodeButton } from "@/components/qr-code-button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { EllipsisVertical, Trash2Icon } from "lucide-react";
import { getProjectUrl } from "@/lib/project-url";
import { DeleteLink } from "@/components/delete-link";
import { useState } from "react";
import Link from "next/link";
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
  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };
  const formattedDate = formatDate(createdAt);

  const shortUrl = `${getProjectUrl()}${shortCode}`;

  const handleCopyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="col-span-2 flex w-full justify-between rounded-lg border border-gray-200 bg-white p-4 pb-5 transition-all duration-200 hover:cursor-pointer hover:drop-shadow-md lg:col-span-1">
      <Link href={`/analytics/${shortCode}`} className="w-full">
        <div className="flex w-full items-center">
          <UrlFavicon url={url} />
          <div className="ml-2 flex w-full flex-col sm:ml-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-x-2">
                <span className="max-w-[150px] truncate text-sm font-semibold text-blue-800 sm:max-w-[300px] md:max-w-[360px] xl:max-w-[500px]">
                  {getProjectUrl()}
                  {shortCode}
                </span>
                <div
                  onClick={handleCopyClick}
                  className="flex items-center space-x-1"
                >
                  <CopyButton isExpired={false} text={shortUrl} />
                  <QRCodeButton url={shortUrl} />
                </div>
                <div className="ml-auto flex shrink-0 items-center space-x-2">
                  <ClicksButton clicks={clicks} />
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <div className="flex flex-row items-center space-x-1 rounded-lg bg-gray-100 p-1.5 text-sm transition-all hover:scale-105 hover:cursor-pointer">
                        <EllipsisVertical
                          width={20}
                          height={20}
                          className="text-gray-700"
                        />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-40">
                      <DropdownMenuItem
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="text-red-500 focus:cursor-pointer focus:bg-red-500 focus:text-white"
                      >
                        <Trash2Icon className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                        <DropdownMenuShortcut>⇧⌘X</DropdownMenuShortcut>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="flex max-w-[70%] items-center gap-x-2 overflow-hidden text-xs font-normal text-gray-600">
                <span className="leading-none">{formattedDate}</span>
                <span className="leading-none text-black">-</span>
                <span className="truncate leading-none">{url}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>

      <DeleteLink
        isOpen={isDeleteDialogOpen}
        setIsOpen={setIsDeleteDialogOpen}
        shortCode={shortCode}
      />
    </div>
  );
}
