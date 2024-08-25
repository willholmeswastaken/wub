"use client";

import { api } from "@/trpc/react";
import { FullLinkCard } from "@/components/full-link-card";
import { CreateLink } from "@/components/create-link";
import { RelaxingGuyIcon } from "@/components/relaxing-guy-icon";
import { type LinkRouterOutputs } from "@/server/api/routers/link";

export function LinksView({
  initialLinks,
}: {
  initialLinks: LinkRouterOutputs["getUserLinks"];
}) {
  const { data } = api.link.getUserLinks.useQuery(undefined, {
    initialData: initialLinks,
  });
  return (
    <section className="mx-auto grid h-full w-full max-w-5xl grid-cols-2 gap-2 px-2 pb-10">
      {data?.length === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-2">
          <h2 className="text-center text-2xl text-gray-600">
            No links found.
          </h2>
          <RelaxingGuyIcon />
          <CreateLink />
        </div>
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
