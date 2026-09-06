"use client";

import { CreateLink } from "@/components/create-link";
import { EmptyState } from "@/components/empty-state";
import { FullLinkCard } from "@/components/full-link-card";
import { type LinkRouterOutputs } from "@/server/api/routers/link";
import { api } from "@/trpc/react";

export function LinksView({
  initialLinks,
}: {
  initialLinks: LinkRouterOutputs["getUserLinks"];
}) {
  const { data } = api.link.getUserLinks.useQuery(undefined, {
    initialData: initialLinks,
  });
  return (
    <section className="mx-auto grid h-full w-full max-w-5xl grid-cols-1 gap-2 px-2 pb-10 sm:grid-cols-2">
      {data?.length === 0 ? (
        <EmptyState
          title="No links found"
          description="Create your first short link to see it here."
        >
          <CreateLink />
        </EmptyState>
      ) : (
        data?.map((link) => (
          <FullLinkCard
            key={link.short_code}
            shortCode={link.short_code}
            url={link.url}
            clicks={link.click_count}
            createdAt={link.created_at}
          />
        ))
      )}
    </section>
  );
}
