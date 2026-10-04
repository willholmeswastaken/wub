import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex flex-1 items-center justify-center px-4 py-24">
      <div className="max-w-sm text-center">
        <p className="text-sm font-medium text-brand">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been deleted, or it belongs to a different account.
        </p>
        <div className="mt-6 flex justify-center gap-2">
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
