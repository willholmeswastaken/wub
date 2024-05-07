'use client';

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LinkIcon } from "./link-icon";
import { BarChartIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ShortLink({ url, clicks, shortUrl, expiresAt }: { url: string, clicks: number, shortUrl: string, expiresAt?: Date | null }) {
    const copyLinkToClipboard = () => {
        navigator.clipboard.writeText(shortUrl)
            .then(() => {
                toast.success("Link copied to clipboard")
            })
            .catch(err => {
                toast.error("Failed to copy link to clipboard")
                console.error(err);
            });
    }

    const isExpired = !!expiresAt && new Date(expiresAt) < new Date();
    return (
        <Card className={cn("hover:border-black duration-75 transition-[border-color] cursor-pointer shadow-lg border-gray-200", isExpired && "line-through text-gray-400 cursor-not-allowed")}>
            <CardHeader className="flex flex-row px-4 py-3 space-x-2 items-center justify-start space-y-0">
                <LinkIcon className="h-10 w-10" />
                <div className="flex flex-col flex-wrap space-y-0 items-start">
                    <div className="flex flex-row space-x-2 items-center">
                        <CardTitle className="">
                            {shortUrl}
                        </CardTitle>
                        <button
                            className={cn("bg-gray-100 hover:bg-blue-200 transition-all rounded-full duration-75 hover:scale-105 active:scale-95 p-1.5", isExpired && "cursor-not-allowed")}
                            disabled={isExpired}
                            onClick={copyLinkToClipboard}
                        >
                            <CopyIcon width={14} height={14} className="text-gray-700 transition-all group-hover:text-blue-800" />
                        </button>
                        <div className="flex flex-row space-x-1 bg-gray-100 p-1.5 rounded-lg items-center text-sm transition-all hover:scale-105">
                            <BarChartIcon width={14} height={14} className="text-gray-700" />
                            <span className="hidden sm:block">{clicks} clicks</span>
                        </div>
                    </div>
                    <CardDescription>{url}</CardDescription>
                </div>
            </CardHeader>
        </Card>
    )
}