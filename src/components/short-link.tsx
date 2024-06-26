'use client';

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LucideTimer, LucideTimerOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { ClicksButton } from "@/components/clicks-button";
import { Logo } from "@/components/logo";

export default function ShortLink({ url, clicks, shortUrl, expiresAt }: { url: string, clicks: number, shortUrl: string, expiresAt?: Date | null }) {
    const isExpired = !!expiresAt && new Date(expiresAt) < new Date();

    const calculateExpiry = useCallback(() => {
        if (!expiresAt) return;
        const diff = new Date(expiresAt).getTime() - new Date().getTime();
        if (diff <= 0) {
            return 'Expired';
        }
        const minutes = Math.floor((diff / 1000) / 60);
        return `${minutes}m`;
    }, [expiresAt]);

    const [expiry, setExpiry] = useState(calculateExpiry());

    useEffect(() => {
        if (!expiresAt) return;
        const interval = setInterval(() => {
            setExpiry(calculateExpiry());
        }, 1000);
        return () => clearInterval(interval);
    }, [calculateExpiry, expiresAt]);

    return (
        <Card className={cn("hover:border-black duration-75 transition-[border-color] cursor-pointer shadow-lg border-gray-200", isExpired && "line-through text-gray-400 cursor-not-allowed")}>
            <CardHeader className="flex flex-row px-4 py-3 space-x-2 items-center justify-start space-y-0">
                <Logo />
                <div className="relative flex flex-col flex-wrap space-y-0 items-start w-full sm:w-3/4">
                    <div className="flex flex-row space-x-2 items-center">
                        <CardTitle className="">
                            {shortUrl}
                        </CardTitle>
                        <CopyButton
                            isExpired={isExpired}
                            text={shortUrl}
                        />
                        <ClicksButton clicks={clicks} />
                    </div>
                    {
                        expiresAt && (
                            <Popover>
                                <PopoverTrigger asChild onMouseEnter={(e) => e.currentTarget.click()} onMouseLeave={(e) => e.currentTarget.click()}>
                                    <div className="absolute -right-2 -top-5 sm:-right-28 w-[117px]">
                                        <span className="rounded-full px-2 py-px text-xs font-medium whitespace-nowrap bg-gray-100 text-gray-800 flex items-center space-x-1 drop-shadow-lg border-gray-400">
                                            {
                                                expiry === 'Expired' ?
                                                    <>
                                                        <LucideTimerOff className="h-4 w-4" />
                                                        <p>Expired</p>
                                                    </> :
                                                    <>
                                                        <LucideTimer className="h-4 w-4" />
                                                        <p>Expires in {expiry}</p>
                                                    </>
                                            }
                                        </span>
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent align="center" side="top" className="w-80">
                                    <div className="flex flex-col">
                                        <span className="text-sm">To prevent abuse of our systems we auto-disable guest created short links after 30 minutes. Just simply create an account below and create as many links as you wish!</span>
                                        <Button className="mt-2">Create an account</Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )
                    }
                    <CardDescription>{url}</CardDescription>
                </div>
            </CardHeader>
        </Card>
    )
}