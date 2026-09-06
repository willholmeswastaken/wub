"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";
import { type Session } from "next-auth";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function HeaderLinks({ user }: { user: Session["user"] | undefined }) {
  const pathname = usePathname();

  return (
    <>
      {user && pathname.toLowerCase() === "/" && (
        <Button asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      )}
      {user && pathname.toLowerCase() !== "/" && (
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Open account menu">
            <Avatar>
              <AvatarImage src={user.image ?? ""} alt="" />
              <AvatarFallback>{user.name?.substring(0, 1)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span>{user.name}</span>
              <span className="text-xs font-normal text-gray-500">
                {user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/api/auth/signout"
                className="flex cursor-pointer items-start justify-start"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {!user && (
        <Button asChild>
          <Link href="/api/auth/signin">Sign In</Link>
        </Button>
      )}
    </>
  );
}
