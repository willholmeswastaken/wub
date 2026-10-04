import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex flex-1 items-center px-4 py-20 md:py-28">
      <div className="mx-auto w-full max-w-xl">
        <p className="font-display text-[clamp(5rem,14vw,8rem)] italic leading-none text-brand">
          404
        </p>
        <h1 className="mt-2 max-w-[12ch] font-display text-4xl font-medium leading-[0.95] tracking-[-0.03em] sm:text-5xl">
          This page left no mark.
        </h1>
        <p className="mt-4 max-w-sm text-muted-foreground">
          It may have been deleted, or it belongs to a different account.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard">Go to your links</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
