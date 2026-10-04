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
import { cn } from "@/lib/utils";
import { Github, Link2, LogOut } from "lucide-react";
import { type Session } from "next-auth";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

export function HeaderLinks({
  user,
  themeToggle,
}: {
  user: Session["user"] | undefined;
  themeToggle: ReactNode;
}) {
  const pathname = usePathname();
  const inProduct =
    pathname === "/dashboard" || pathname.startsWith("/analytics");

  return (
    <>
      {user && (
        <nav className="flex items-center">
          <Link
            href="/dashboard"
            aria-current={inProduct ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              inProduct && "bg-muted text-foreground",
            )}
          >
            Links
          </Link>
        </nav>
      )}
      <div className="ml-auto flex items-center gap-1">
        <a
          href="https://github.com/willholmeswastaken/wub"
          target="_blank"
          rel="noreferrer"
          aria-label="Wub on GitHub"
          className="hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
        >
          <Github className="h-4 w-4" />
        </a>
        {themeToggle}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="ml-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Account"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.image ?? ""} alt="" />
                <AvatarFallback>{user.name?.substring(0, 1)}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel className="flex flex-col">
                <span className="truncate">{user.name}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="cursor-pointer">
                  <Link2 className="mr-2 h-4 w-4" />
                  Your links
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => void signOut({ callbackUrl: "/" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          pathname !== "/signin" && (
            <Button asChild size="sm" className="ml-1">
              <Link href="/signin">Sign in</Link>
            </Button>
          )
        )}
      </div>
    </>
  );
}
