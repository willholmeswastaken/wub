'use client';

import { api } from "@/trpc/react";
import { FullLinkCard } from "@/components/full-link-card";
import { CreateLink } from "@/components/create-link";
import { RelaxingGuyIcon } from "@/components/relaxing-guy-icon";
import { type LinkRouterOutputs } from "@/server/api/routers/link";

export function LinksView({ initialLinks }: { initialLinks: LinkRouterOutputs['getUserLinks'] }) {
    const { data } = api.link.getUserLinks.useQuery(undefined, { initialData: initialLinks });
    return (
        <section className="h-full flex-1 mx-auto max-w-2xl w-full px-2 flex flex-col space-y-3">
            {
                data?.length === 0
                    ? <div className="flex flex-col justify-center items-center space-y-2">
                        <h2 className="text-2xl text-gray-600 text-center">No links found.</h2>
                        <RelaxingGuyIcon />
                        <CreateLink />
                    </div>
                    : data?.map(link => (
                        <FullLinkCard
                            key={link.short_code}
                            shortCode={link.short_code}
                            url={link.url}
                            clicks={link.click_count}
                            createdAt={link.created_at}
                        />
                    ))
            }
        </section>
    )
};
