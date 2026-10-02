import { HeaderLinks } from "@/components/header-links";
import { Logo } from "@/components/logo";
import { getServerAuthSession } from "@/server/auth";
import Link from "next/link";

export async function Header() {
  const data = await getServerAuthSession();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4">
      <Link className="flex items-center" href="/">
        <Logo />
        <span className="sr-only">Link Shortener</span>
      </Link>
      <HeaderLinks user={data?.user} />
    </header>
  );
}
