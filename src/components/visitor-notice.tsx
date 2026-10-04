import { Button } from "@/components/ui/button";
import Link from "next/link";
import { type ReactNode } from "react";

export function VisitorNotice({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <section className="flex flex-1 items-center justify-center px-5 py-24 md:py-32">
      <div className="w-full max-w-lg">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-foreground">
          {icon}
        </div>
        <h1 className="mt-8 text-balance text-4xl font-medium tracking-[-0.045em] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-md text-balance text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          If someone sent you this link, ask them for a new one.
        </p>
        <div className="mt-12 border-t border-border/80 pt-8">
          <p className="text-sm font-medium">Need short links of your own?</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Wub is free and open source. Paste a link and get a short one in
            seconds.
          </p>
          <Button asChild className="mt-5">
            <Link href="/">Create a short link</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
