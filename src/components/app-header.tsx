import { CreateLink } from "@/components/create-link";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function AppHeader({
  pageTitle,
  hideCta,
}: {
  pageTitle: string;
  hideCta?: boolean;
}) {
  return (
    <section className="border-y border-border bg-card p-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {hideCta && (
            <Link
              href="/dashboard"
              aria-label="Back to dashboard"
              className="rounded-lg bg-muted p-2 transition-all hover:scale-105"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </Link>
          )}
          <h1 className="text-2xl text-foreground">{pageTitle}</h1>
        </div>
        {!hideCta && <CreateLink />}
      </div>
    </section>
  );
}
