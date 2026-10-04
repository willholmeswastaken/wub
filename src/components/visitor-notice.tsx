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
    <section className="flex flex-1 items-center px-4 py-20 md:py-28">
      <div className="mx-auto w-full max-w-xl">
        <div className="flex h-16 w-16 rotate-[-8deg] items-center justify-center rounded-full border-2 border-dashed border-brand text-brand">
          {icon}
        </div>
        <h1 className="mt-6 max-w-[14ch] font-display text-[clamp(2.4rem,5vw,3.8rem)] font-medium leading-[0.92] tracking-[-0.03em]">
          {title}
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          If someone sent you this link, ask them for a new one.
        </p>
        <div className="slip mt-10 max-w-md p-5">
          <p className="eyebrow">Still here</p>
          <p className="mt-3 font-display text-2xl font-medium leading-none">
            Need short links of your own?
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Wub is free and open source. Paste a link and get a short one in
            seconds.
          </p>
          <Button asChild size="sm" className="mt-5">
            <Link href="/">Create a short link</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
