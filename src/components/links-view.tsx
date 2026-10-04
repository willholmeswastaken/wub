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
import { Search, X } from "lucide-react";
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
    <section className="mx-auto w-full max-w-6xl px-6 py-12 md:px-8 md:py-16">
      <div className="flex items-end justify-between gap-8">
        <div>
          <h1 className="text-4xl font-medium tracking-[-0.05em] sm:text-5xl">
            Links
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground md:text-base">
            Paste a long link. The short one is copied for you.
          </p>
        </div>
        <p className="hidden text-right sm:block">
          <span className="block text-4xl font-medium tabular-nums tracking-[-0.05em]">
            {links.length}
          </span>
          <span className="text-sm text-muted-foreground">saved</span>
        </p>
      </div>
      <div className="mt-10">
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
      </div>
      {result && (
        <div className="mt-6">
          <LinkResultCard
            key={result.shortCode}
            shortUrl={result.shortUrl}
            url={result.url}
            autoCopied={result.autoCopied}
          />
        </div>
      )}
      {links.length === 0 ? (
        <EmptyState projectUrl={projectUrl} />
      ) : (
        <div className="mt-14">
          <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center">
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
                className="h-11 w-full rounded-full border border-transparent bg-muted/80 pl-9 pr-9 text-sm outline-none transition-colors focus-visible:border-input focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring"
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
                <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md bg-background px-1.5 text-xs text-muted-foreground sm:block">
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
                    "flex-1 whitespace-nowrap rounded-full px-3 py-1.5 font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    sort === value && "bg-background text-foreground shadow-sm",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {visibleLinks.length === 0 ? (
            <div className="px-4 py-16 text-center text-sm text-muted-foreground">
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
            <div className="border-t border-border/80">
              <div className="hidden grid-cols-[minmax(0,1fr)_7.5rem_5.5rem_6rem] gap-x-8 px-4 pb-2 pt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground md:grid">
                <span>Link</span>
                <span>7 days</span>
                <span className="text-right">Clicks</span>
                <span className="sr-only">Actions</span>
              </div>
              {visibleLinks.map((link) => {
                const shortUrl = `${projectUrl}${link.short_code}`;
                return (
                  <LinkRow
                    key={link.short_code}
                    layout="ledger"
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
    <div className="mt-16 border-t border-border/80 pt-10">
      <h2 className="text-2xl font-medium tracking-[-0.04em]">
        Your links live here
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Paste a long link anywhere on this page to shorten it. Each one gets a
        row like this, with clicks over the last week.
      </p>
      <div
        aria-hidden
        className="pointer-events-none mt-8 max-w-3xl select-none"
      >
        <LinkRow
          layout="ledger"
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
