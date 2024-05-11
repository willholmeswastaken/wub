import Link from "next/link";
import { LinkIcon } from "@/components/link-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getServerAuthSession } from "@/server/auth";
import { HeaderLinks } from "./header-links";

export async function Header() {
    const data = await getServerAuthSession();

    return (
        <header className="px-4 lg:px-6 h-14 flex items-center justify-between">
            <Link className="flex items-center justify-center" href="#">
                <LinkIcon className="h-6 w-6" />
                <span className="sr-only">Link Shortener</span>
            </Link>
            <HeaderLinks
                user={data?.user}
            />
            {/* <nav className="ml-auto flex gap-4 sm:gap-6">
                <Link className="text-sm font-medium hover:underline underline-offset-4" href="#">
                    Features
                </Link>
                <Link className="text-sm font-medium hover:underline underline-offset-4" href="#">
                    Pricing
                </Link>
                <Link className="text-sm font-medium hover:underline underline-offset-4" href="#">
                    About
                </Link>
                <Link className="text-sm font-medium hover:underline underline-offset-4" href="#">
                    Contact
                </Link>
            </nav> */}
        </header>
    )
}