"use client";

import { LinkRow } from "@/components/link-row";
import { useProjectUrl } from "@/components/project-url-provider";
import { ShortenForm } from "@/components/shorten-form";
import { type LinkRouterOutputs } from "@/server/api/routers/link";
import { api } from "@/trpc/react";
import copy from "clipboard-copy";
import { useState } from "react";
import { toast } from "sonner";

function formatCreatedAt(createdAt: Date | string) {
  return new Date(createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

export function LinksView({
  initialLinks,
}: {
  initialLinks: LinkRouterOutputs["getUserLinks"];
}) {
  const projectUrl = useProjectUrl();
  const utils = api.useUtils();
  const createLink = api.link.create.useMutation();
  const [justCopiedCode, setJustCopiedCode] = useState<string | null>(null);
  const { data } = api.link.getUserLinks.useQuery(undefined, {
    initialData: initialLinks,
  });

  return (
    <section className="mx-auto w-full max-w-[720px] px-4 py-8">
      <ShortenForm
        onSubmit={async (url) => {
          const link = await createLink.mutateAsync({ url });
          const shortLink = `${projectUrl}${link.short_code}`;
          setJustCopiedCode(link.short_code);
          toast.success("Short link created", {
            description: shortLink,
            action: {
              label: "Copy link",
              onClick: () => {
                void copy(shortLink);
              },
            },
          });
          await utils.link.getUserLinks.invalidate();
        }}
      />
      {data.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-muted-foreground">
          No links yet. Shorten a URL to get started.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-background">
          {data.map((link, index) => (
            <div
              key={link.short_code}
              className={index > 0 ? "border-t border-border" : undefined}
            >
              <LinkRow
                url={link.url}
                shortUrl={`${projectUrl}${link.short_code}`}
                clicks={link.click_count}
                subtitle={`${formatCreatedAt(link.created_at)} · ${link.url}`}
                href={`/analytics/${link.short_code}`}
                initiallyCopied={justCopiedCode === link.short_code}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
