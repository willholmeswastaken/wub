"use client";

import { LinkResultCard } from "@/components/link-result-card";
import { LinkRow } from "@/components/link-row";
import { useProjectUrl } from "@/components/project-url-provider";
import { ShortenForm } from "@/components/shorten-form";
import { copyToClipboard } from "@/lib/clipboard";
import { type LinkRouterOutputs } from "@/server/api/routers/link";
import { useRecentlyClaimed } from "@/stores/link";
import { api } from "@/trpc/react";
import { useState } from "react";

function formatCreatedAt(createdAt: Date | string) {
  return new Date(createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

type Result = {
  shortCode: string;
  shortUrl: string;
  url: string;
  autoCopied: boolean;
};

export function LinksView({
  initialLinks,
}: {
  initialLinks: LinkRouterOutputs["getUserLinks"];
}) {
  const projectUrl = useProjectUrl();
  const utils = api.useUtils();
  const createLink = api.link.create.useMutation();
  const [result, setResult] = useState<Result | null>(null);
  const claimedCodes = useRecentlyClaimed((state) => state.codes);
  const { data } = api.link.getUserLinks.useQuery(undefined, {
    initialData: initialLinks,
  });

  return (
    <section className="mx-auto w-full max-w-[720px] space-y-4 px-4 py-8">
      <ShortenForm
        focusOnMount
        capturePaste
        shortcuts={{ modK: true }}
        onSubmit={async (url) => {
          const link = await createLink.mutateAsync({ url });
          const shortUrl = `${projectUrl}${link.short_code}`;
          const autoCopied = await copyToClipboard(shortUrl);
          setResult({
            shortCode: link.short_code,
            shortUrl,
            url: link.url,
            autoCopied,
          });
          await utils.link.getUserLinks.invalidate();
        }}
      />
      {result && (
        <LinkResultCard
          key={result.shortCode}
          shortUrl={result.shortUrl}
          url={result.url}
          autoCopied={result.autoCopied}
        />
      )}
      {data.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-muted-foreground">
          No links yet. Shorten a URL to get started.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-background">
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
                isHighlighted={
                  claimedCodes.includes(link.short_code) ||
                  result?.shortCode === link.short_code
                }
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
