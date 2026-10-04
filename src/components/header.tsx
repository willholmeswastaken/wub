import { HeaderLinks } from "@/components/header-links";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { getServerAuthSession } from "@/server/auth";
import Link from "next/link";

export async function Header() {
  const session = await getServerAuthSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4">
        <Link
          className="mr-2 flex items-center gap-2 rounded-md font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/"
        >
          <Logo />
          <span>wub</span>
        </Link>
        <HeaderLinks user={session?.user} themeToggle={<ThemeToggle />} />
      </div>
    </header>
  );
}
