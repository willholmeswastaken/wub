"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CopyButton } from "@/components/copy-button";
import { ClicksButton } from "@/components/clicks-button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { EllipsisVertical, Trash2Icon } from "lucide-react";
import { getProjectUrl } from "@/lib/project-url";
import { Logo } from "@/components/logo";
import { type User } from "next-auth";
import { DeleteLink } from "@/components/delete-link";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function FullLinkCard({
  shortCode,
  url,
  clicks,
  createdAt,
  user,
}: {
  shortCode: string;
  url: string;
  clicks: number;
  createdAt: Date;
  user: User;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { push } = useRouter();
  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };
  const formattedDate = formatDate(createdAt);

  const shortUrl = `${getProjectUrl()}${shortCode}`;

  const hostname = new URL(url).hostname;

  return (
    <div className="flex w-full justify-between rounded-lg border-gray-50 bg-white p-4 shadow-lg transition-all duration-200 hover:cursor-pointer hover:shadow-xl">
      <Link href={`/analytics/${shortCode}`} className="w-full">
        <div className="relative flex items-center justify-between">
          <div className="relative flex shrink items-center">
            <Avatar className="h-6 w-6">
              <AvatarImage
                src={`https://icons.duckduckgo.com/ip3/${hostname}.ico`}
                alt={`${url} website logo`}
              />
              <AvatarFallback>
                <Logo />
              </AvatarFallback>
            </Avatar>
            <div className="ml-2 sm:ml-4">
              <div className="flex max-w-fit flex-wrap items-center gap-x-2 pb-2">
                <span className="max-w-[150px] truncate text-sm font-semibold text-blue-800 sm:max-w-[300px] sm:text-base md:max-w-[360px] xl:max-w-[500px]">
                  {getProjectUrl()}
                  {shortCode}
                </span>
                <CopyButton isExpired={false} text={shortUrl} />
              </div>
              <div className="flex max-w-fit flex-wrap items-center gap-x-2 text-sm font-normal text-gray-600">
                <Avatar className="hidden h-4 w-4 sm:block">
                  <AvatarFallback>
                    <span>{user.name?.substring(0, 1)}</span>
                  </AvatarFallback>
                  <AvatarImage src={user.image ?? ""} />
                </Avatar>
                <span className="hidden text-black sm:block">-</span>
                <span className="text-xs">{formattedDate}</span>
                <span className="text-black">-</span>
                <span className="text-xs">{url}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
      <div className="flex min-w-fit flex-row items-center space-x-1">
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
      <DeleteLink
        isOpen={isDeleteDialogOpen}
        setIsOpen={setIsDeleteDialogOpen}
        shortCode={shortCode}
      />
    </div>
  );
}
