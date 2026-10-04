import { HeaderLinks } from "@/components/header-links";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { getServerAuthSession } from "@/server/auth";
import Link from "next/link";

export async function Header() {
  const session = await getServerAuthSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-2 px-5">
        <Link
          className="mr-1 flex items-center gap-2.5 rounded-full text-[15px] font-medium tracking-[-0.03em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
