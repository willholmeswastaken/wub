'use client';

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LinkIcon } from "./link-icon";

export default function ShortLink({ url, clicks }: { url: string, clicks: number }) {
    // make it animate in
    // add copy button
    // make clicks look cool with icon graph
    // add a default favicon
    return (
        <Card className="hover:border-black cursor-pointer shadow-lg border-gray-200">
            <CardHeader className="flex flex-row p-4 space-x-2 items-start justify-start space-y-0">
                <LinkIcon />
                <div className="flex flex-col items-start justify-start space-y-0">
                    <CardTitle className="flex flex-row space-x-2">
                        <span>{url}</span>
                        <span>{clicks}</span>
                    </CardTitle>
                    <CardDescription>{url}</CardDescription>
                </div>
            </CardHeader>
        </Card>
    )
}