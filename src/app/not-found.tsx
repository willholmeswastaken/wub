import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex flex-1 items-center justify-center px-5 py-24 md:py-32">
      <div className="max-w-lg">
        <p className="text-[13px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          404
        </p>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.045em] sm:text-5xl">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-4 max-w-sm text-base leading-relaxed text-muted-foreground">
          It may have been deleted, or it belongs to a different account.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
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
