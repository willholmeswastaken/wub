import { HeaderLinks } from "@/components/header-links";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { getServerAuthSession } from "@/server/auth";
import Link from "next/link";

export async function Header() {
  const data = await getServerAuthSession();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4 lg:px-6">
      <Link className="flex items-center gap-2 text-foreground" href="/">
        <Logo />
        <span className="text-sm font-semibold tracking-tight">Wub</span>
        <span className="sr-only">Link Shortener</span>
      </Link>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <HeaderLinks user={data?.user} />
      </div>
    </header>
  );
}
