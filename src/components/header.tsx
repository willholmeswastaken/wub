import { HeaderLinks } from "@/components/header-links";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { getServerAuthSession } from "@/server/auth";
import Link from "next/link";

export async function Header() {
  const session = await getServerAuthSession();

  return (
    <header className="sticky top-0 z-40 border-b-2 border-foreground bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4">
        <Link
          className="mr-2 flex items-center gap-2.5 rounded-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/"
        >
          <span className="relative grid h-9 w-9 place-items-center text-brand">
            <span className="absolute inset-0 rounded-full border-2 border-current [transform:rotate(-12deg)]" />
            <span className="absolute inset-[5px] rounded-full border border-current opacity-60" />
            <span className="text-foreground">
              <Logo />
            </span>
          </span>
          <span className="font-display text-[1.7rem] font-medium italic leading-none tracking-tight">
            wub
          </span>
        </Link>
        <HeaderLinks user={session?.user} themeToggle={<ThemeToggle />} />
      </div>
    </header>
  );
}
