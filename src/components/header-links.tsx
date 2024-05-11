'use client';

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { type Session } from "next-auth";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeaderLinks({ user }: { user: Session["user"] | undefined }) {
    const pathname = usePathname();

    return (
        <>
            {
                user && pathname.toLowerCase() === "/" && (
                    <Button asChild>
                        <Link href="/dashboard">Dashboard</Link>
                    </Button>
                )
            }
            {
                user && pathname.toLowerCase() !== '/' && (
                    <Avatar>
                        <AvatarImage src="https://github.com/shadcn.png" />
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                )
            }
            {
                !user && (
                    <Button asChild>
                        <Link href="/api/auth/signin">Sign In</Link>
                    </Button>
                )
            }
        </>
    )
}