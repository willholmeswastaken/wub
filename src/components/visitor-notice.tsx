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
    <section className="flex flex-1 items-center justify-center px-4 py-20 md:py-28">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          {icon}
        </div>
        <h1 className="mt-6 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-balance text-muted-foreground">
          {description}
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          If someone sent you this link, ask them for a new one.
        </p>
        <div className="mt-10 rounded-2xl border border-border bg-background p-5 text-left">
          <p className="text-sm font-medium">Need short links of your own?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Wub is free and open source. Paste a link and get a short one in
            seconds.
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/">Create a short link</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
