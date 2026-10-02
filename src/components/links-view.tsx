"use client";

import { LinkResultCard } from "@/components/link-result-card";
import { LinkRow } from "@/components/link-row";
import { LinkRowMenu } from "@/components/link-row-menu";
import { useProjectUrl } from "@/components/project-url-provider";
import { ShortenForm } from "@/components/shorten-form";
import { copyToClipboard } from "@/lib/clipboard";
import { relativeTime } from "@/lib/format";
import { usePendingDeletes } from "@/lib/pending-deletes";
import { hostnameOf } from "@/lib/url";
import { cn } from "@/lib/utils";
import { type LinkRouterOutputs } from "@/server/api/routers/link";
import { useRecentlyClaimed } from "@/stores/link";
import { api } from "@/trpc/react";
import { Link2, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Result = {
  shortCode: string;
  shortUrl: string;
  url: string;
  autoCopied: boolean;
};

type Sort = "recent" | "clicks";

const SAMPLE_SPARKLINE = [2, 5, 3, 9, 14, 11, 18];

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export function LinksView({
  initialLinks,
}: {
  initialLinks: LinkRouterOutputs["getUserLinks"];
}) {
  const projectUrl = useProjectUrl();
  const utils = api.useUtils();
  const createLink = api.link.create.useMutation();
  const [result, setResult] = useState<Result | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const searchRef = useRef<HTMLInputElement>(null);
  const claimedCodes = useRecentlyClaimed((state) => state.codes);
  const pendingDeletes = usePendingDeletes((state) => state.codes);
  const { data } = api.link.getUserLinks.useQuery(undefined, {
    initialData: initialLinks,
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const links = useMemo(
    () => data.filter((link) => !pendingDeletes.includes(link.short_code)),
    [data, pendingDeletes],
  );

  const visibleLinks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? links.filter(
          (link) =>
            link.short_code.toLowerCase().includes(needle) ||
            link.url.toLowerCase().includes(needle),
        )
      : links;
    if (sort === "clicks") {
      return [...filtered].sort((a, b) => b.click_count - a.click_count);
    }
    return filtered;
  }, [links, query, sort]);

  return (
    <section className="mx-auto w-full max-w-[720px] space-y-4 px-4 py-8">
      <ShortenForm
        focusOnMount
        capturePaste
        shortcuts={{ modK: true }}
        slugPrefix={projectUrl}
        onSubmit={async (url, { slug }) => {
          const link = await createLink.mutateAsync({ url, slug });
          const shortUrl = `${projectUrl}${link.short_code}`;
          const autoCopied = await copyToClipboard(shortUrl);
          utils.link.getUserLinks.setData(undefined, (previous) => [
            {
              short_code: link.short_code,
              url: link.url,
              created_at: link.created_at ?? new Date(),
              click_count: 0,
              last_clicked: null,
              recentClicks: [0, 0, 0, 0, 0, 0, 0],
            },
            ...(previous ?? []).filter(
              (existing) => existing.short_code !== link.short_code,
            ),
          ]);
          setResult({
            shortCode: link.short_code,
            shortUrl,
            url: link.url,
            autoCopied,
          });
          setQuery("");
          void utils.link.getUserLinks.invalidate();
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
      {links.length === 0 ? (
        <EmptyState projectUrl={projectUrl} />
      ) : (
        <div className="space-y-3 pt-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <label htmlFor="link-search" className="sr-only">
                Search links
              </label>
              <input
                ref={searchRef}
                id="link-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setQuery("");
                    event.currentTarget.blur();
                  }
                }}
                placeholder={`Search ${links.length} ${links.length === 1 ? "link" : "links"}`}
                autoComplete="off"
                spellCheck={false}
                className="h-10 w-full rounded-full border border-input bg-background pl-9 pr-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 text-xs text-muted-foreground sm:block">
                  /
                </kbd>
              )}
            </div>
            <div className="flex shrink-0 rounded-full bg-muted p-1 text-sm">
              <span className="sr-only">Sort by</span>
              {(
                [
                  ["recent", "Recent"],
                  ["clicks", "Most clicked"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={sort === value}
                  onClick={() => setSort(value)}
                  className={cn(
                    "flex-1 rounded-full px-3 py-1.5 font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    sort === value && "bg-background text-foreground shadow-sm",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {visibleLinks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
              No links match &ldquo;{query}&rdquo;.{" "}
              <button
                type="button"
                onClick={() => setQuery("")}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              {visibleLinks.map((link, index) => {
                const shortUrl = `${projectUrl}${link.short_code}`;
                return (
                  <div
                    key={link.short_code}
                    className={index > 0 ? "border-t border-border" : undefined}
                  >
                    <LinkRow
                      url={link.url}
                      shortUrl={shortUrl}
                      clicks={link.click_count}
                      subtitle={`${hostnameOf(link.url) ?? link.url} · ${relativeTime(link.created_at)}`}
                      href={`/analytics/${link.short_code}`}
                      sparkline={link.recentClicks}
                      isHighlighted={
                        claimedCodes.includes(link.short_code) ||
                        result?.shortCode === link.short_code
                      }
                      actions={
                        <LinkRowMenu
                          shortCode={link.short_code}
                          shortUrl={shortUrl}
                          url={link.url}
                        />
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function EmptyState({ projectUrl }: { projectUrl: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <Link2 className="h-6 w-6" />
      </div>
      <h2 className="mt-4 font-semibold">Your links live here</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Paste a long link anywhere on this page to shorten it. Each one gets a
        row like this, with clicks over the last week:
      </p>
      <div
        aria-hidden
        className="pointer-events-none mx-auto mt-6 max-w-md select-none overflow-hidden rounded-2xl border border-border bg-background text-left opacity-80"
      >
        <LinkRow
          url="https://github.com"
          shortUrl={`${projectUrl}launch`}
          clicks={62}
          subtitle="github.com · just now"
          sparkline={SAMPLE_SPARKLINE}
        />
      </div>
    </div>
  );
}
