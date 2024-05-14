'use client';

import { AppHeader } from "@/components/app-header";
import { FullLinkCard } from "@/components/full-link-card";
import { api } from "@/trpc/react";

export default function Dashboard() {
    const links = api.link.getUserLinks.useQuery();
    return (
        <div className="flex flex-col space-y-10">
            <AppHeader />
            <section className="h-full flex-1 mx-auto max-w-2xl w-full px-2 flex flex-col space-y-3">
                {
                    links.data?.map(link => (
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
        </div>
    )
}