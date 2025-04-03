import { CreateLink } from "@/components/create-link";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function AppHeader({
  pageTitle,
  hideCta,
}: {
  pageTitle: string;
  hideCta?: boolean;
}) {
  return (
    <section className="border-y border-gray-200 bg-white p-10">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <div className="flex items-center gap-4">
          {hideCta && (
            <Link
              href="/dashboard"
              className="rounded-lg bg-gray-100 p-2 transition-all hover:scale-105"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
          )}
          <h1 className="text-2xl text-gray-600">{pageTitle}</h1>
        </div>
        {!hideCta && <CreateLink />}
      </div>
    </section>
  );
}
