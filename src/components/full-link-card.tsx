'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CopyButton } from "@/components/copy-button";
import { ClicksButton } from "@/components/clicks-button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut } from "@/components/ui/dropdown-menu";
import { EllipsisVertical, Trash2Icon } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { getProjectUrl } from "@/lib/project-url";
import { useLinkStore } from "@/stores/link";
import { Logo } from "@/components/logo";
import { type User } from "next-auth";

export function FullLinkCard({ shortCode, url, clicks, createdAt, user }: { shortCode: string, url: string, clicks: number, createdAt: Date, user: User }) {
    const deleteLinkFromCache = useLinkStore(state => state.deleteLink);
    const formatDate = (date: Date): string => {
        const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    };
    const utils = api.useUtils();
    const deleteLink = api.link.deleteLink.useMutation({
        onSuccess: async () => {
            await utils.link.getUserLinks.refetch();
            toast.success("Link deleted successfully!");
            deleteLinkFromCache(shortCode);
        }
    });

    const handleDelete = (shortCode: string) => {
        deleteLink.mutate(shortCode);
    };

    const formattedDate = formatDate(createdAt);
    return (
        <div className="w-full bg-white rounded-lg shadow-lg p-4 border-gray-50 hover:shadow-xl duration-200 transition-all hover:cursor-pointer">
            <div className="flex items-center justify-between relative">
                <div className="relative flex shrink items-start">
                    <Avatar>
                        <AvatarFallback><Logo /></AvatarFallback>
                    </Avatar>
                    <div className="ml-2 sm:ml-4">
                        <div className="flex max-w-fit flex-wrap items-center gap-x-2 pb-2">
                            <a href="#" className="max-w-[150px] truncate text-sm font-semibold text-blue-800 sm:max-w-[300px] sm:text-base md:max-w-[360px] xl:max-w-[500px]">{getProjectUrl()}{shortCode}</a>
                            <CopyButton
                                isExpired={false}
                                text={`${getProjectUrl()}${shortCode}`}
                            />
                        </div>
                        <div className="flex max-w-fit flex-wrap items-center gap-x-2 text-sm font-normal text-gray-600">
                            <Avatar className="w-4 h-4">
                                <AvatarFallback>
                                    <span>{user.name?.substring(0, 1)}</span>
                                </AvatarFallback>
                                <AvatarImage src={user.image ?? ''} />
                            </Avatar>
                            <span className="text-black">-</span>
                            <span>{formattedDate}</span>
                            <span className="text-black">-</span>
                            <a href="#" className="hover:underline">{url}</a>
                        </div>
                    </div>
                </div>
                <div className="flex flex-row space-x-1">
                    <ClicksButton clicks={clicks} />
                    <DropdownMenu>
                        <DropdownMenuTrigger>
                            <div className="flex flex-row space-x-1 bg-gray-100 p-1.5 rounded-lg items-center text-sm transition-all hover:scale-105 hover:cursor-pointer">
                                <EllipsisVertical width={20} height={20} className="text-gray-700" />
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-40">
                            <DropdownMenuItem className="text-red-500 focus:bg-red-500 focus:text-white focus:cursor-pointer" onClick={() => handleDelete(shortCode)}>
                                <Trash2Icon className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                                <DropdownMenuShortcut>⇧⌘X</DropdownMenuShortcut>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    )
}