"use client";

import { CreateLink } from "@/components/create-link";
import { EmptyState } from "@/components/empty-state";
import { FullLinkCard } from "@/components/full-link-card";
import { Input } from "@/components/ui/input";
import { type LinkRouterOutputs } from "@/server/api/routers/link";
import { api } from "@/trpc/react";
import { useMemo, useState } from "react";

export function LinksView({
  initialLinks,
}: {
  initialLinks: LinkRouterOutputs["getUserLinks"];
}) {
  const { data } = api.link.getUserLinks.useQuery(undefined, {
    initialData: initialLinks,
  });
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return data ?? [];
    return (data ?? []).filter(
      (link) =>
        link.url.toLowerCase().includes(value) ||
        link.short_code.toLowerCase().includes(value),
    );
  }, [data, query]);

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pb-10">
      {(data?.length ?? 0) > 0 ? (
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search links"
          aria-label="Search links"
        />
      ) : null}
      {data?.length === 0 ? (
        <EmptyState
          title="No links yet"
          description="Create your first short link to see it here."
        >
          <CreateLink />
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matching links"
          description="Try a different search."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((link) => (
            <FullLinkCard
              key={link.short_code}
              shortCode={link.short_code}
              url={link.url}
              clicks={link.click_count}
              createdAt={link.created_at}
            />
          ))}
        </div>
      )}
    </section>
  );
}
