import { HeaderLinks } from "@/components/header-links";
import { Logo } from "@/components/logo";
import { getServerAuthSession } from "@/server/auth";
import Link from "next/link";

export async function Header() {
  const data = await getServerAuthSession();

  return (
    <header className="lg:px- flex h-14 items-center justify-between px-4">
      <Link className="flex items-start justify-center" href="/">
        <Logo />
        <span className="sr-only">Link Shortener</span>
      </Link>
      <HeaderLinks user={data?.user} />
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
  );
}
