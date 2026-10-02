"use client";

import { useProjectUrl } from "@/components/project-url-provider";
import { ShortenForm } from "@/components/shorten-form";
import { type links } from "@/server/db/schema";
import { useLinkStore } from "@/stores/link";
import { api } from "@/trpc/react";
import copy from "clipboard-copy";
import { type InferInsertModel } from "drizzle-orm";
import { useState } from "react";
import { toast } from "sonner";

import LinkStackView from "./link-stack-view";

export function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  const addTempLink = useLinkStore((state) => state.addLink);
  const projectUrl = useProjectUrl();
  const [highlightCode, setHighlightCode] = useState<string | null>(null);
  const anonMutation = api.link.createAnon.useMutation();
  const loggedInMutation = api.link.create.useMutation();

  const onShortLinkSuccess = (link: InferInsertModel<typeof links>) => {
    const shortLink = `${projectUrl}${link.short_code}`;
    toast.success("Short link created", {
      description: shortLink,
      action: {
        label: "Copy link",
        onClick: () => {
          void copy(shortLink);
        },
      },
    });
    addTempLink({
      url: link.url,
      clicks: link.click_count ?? 0,
      shortUrl: shortLink,
      expiresAt: link.expires_at,
      shortCode: link.short_code,
    });
    setHighlightCode(link.short_code);
  };

  return (
    <section className="w-full py-16 md:py-32">
      <div className="container px-4">
        <div className="flex flex-col items-center gap-8 text-center">
          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Short Links That Change The World
            </h1>
            <p className="mx-auto max-w-[525px] text-base text-muted-foreground md:text-xl">
              Wub is the open-source link shortener that is built to scale.
            </p>
          </div>
          <div className="w-full max-w-lg space-y-6">
            <ShortenForm
              onSubmit={async (url) => {
                const link = isLoggedIn
                  ? await loggedInMutation.mutateAsync({ url })
                  : await anonMutation.mutateAsync({ url });
                onShortLinkSuccess(link);
              }}
            />
            <LinkStackView highlightCode={highlightCode} />
          </div>
        </div>
      </div>
    </section>
  );
}
