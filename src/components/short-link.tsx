'use client';

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LinkIcon } from "./link-icon";
import { CopyIcon } from "lucide-react";

export default function ShortLink({ url, clicks, shortUrl }: { url: string, clicks: number, shortUrl: string }) {
    // make it animate in
    // add copy button
    // make clicks look cool with icon graph
    // add a default favicon
    return (
        <Card className="hover:border-black duration-75 transition-[border-color] cursor-pointer shadow-lg border-gray-200">
            <CardHeader className="flex flex-row p-4 space-x-2 items-center justify-start space-y-0">
                <LinkIcon className="h-10 w-10" />
                <div className="flex flex-col space-y-0 items-start">
                    <CardTitle className="flex flex-row space-x-2 items-center">
                        <span>{shortUrl}</span>
                        <span>{clicks}</span>
                        <button className="bg-gray-100 hover:bg-blue-200 transition-all rounded-full duration-75 hover:scale-105 active:scale-95 p-1.5"><CopyIcon width={14} height={14} className="text-gray-700 transition-all group-hover:text-blue-800" /></button>
                    </CardTitle>
                    <CardDescription>{url}</CardDescription>
                </div>
            </CardHeader>
        </Card>
    )
}