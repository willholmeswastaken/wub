import { HeaderLinks } from "@/components/header-links";
import { iconButtonClassName } from "@/components/icon-button";
import { Logo } from "@/components/logo";
import { getServerAuthSession } from "@/server/auth";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export async function ProductBar({
  title,
  backHref,
}: {
  title: string;
  backHref?: string;
}) {
  const session = await getServerAuthSession();

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 w-full max-w-[720px] items-center gap-4 px-4">
        {backHref ? (
          <Link
            href={backHref}
            className={iconButtonClassName()}
            aria-label="Back to links"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        ) : (
          <Link href="/" className="shrink-0" aria-label="Home">
            <Logo />
          </Link>
        )}
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold">
          {title}
        </h1>
        <HeaderLinks user={session?.user} />
      </div>
    </header>
  );
}
