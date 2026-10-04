"use client";

import { LinkResultCard } from "@/components/link-result-card";
import { useProjectUrl } from "@/components/project-url-provider";
import { ShortenForm } from "@/components/shorten-form";
import { copyToClipboard } from "@/lib/clipboard";
import { useLinkStore } from "@/stores/link";
import { api } from "@/trpc/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import LinkStackView from "./link-stack-view";
import { formatCountdown, useCountdown } from "./short-link";

type Result = {
  shortCode: string;
  shortUrl: string;
  url: string;
  autoCopied: boolean;
  expiresAt: Date | null;
};

function KeepForeverPitch({ expiresAt }: { expiresAt: Date }) {
  const remaining = useCountdown(expiresAt);
  const expired = remaining !== null && remaining <= 0;
  return (
    <Link
      href="/signin?callbackUrl=/dashboard"
      className="flex items-center justify-between gap-4 border-t border-foreground/10 bg-brand/[0.06] px-5 py-3 text-sm hover:bg-brand/10"
    >
      <span className="text-muted-foreground">
        {expired ? (
          "This link has expired."
        ) : (
          <>
            Expires in{" "}
            <span className="font-medium tabular-nums text-foreground">
              {formatCountdown(remaining ?? 0)}
            </span>
          </>
        )}
      </span>
      <span className="inline-flex items-center gap-1 font-medium text-brand">
        Keep it forever
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

export function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  const addTempLink = useLinkStore((state) => state.addLink);
  const projectUrl = useProjectUrl();
  const [result, setResult] = useState<Result | null>(null);
  const anonMutation = api.link.createAnon.useMutation();
  const loggedInMutation = api.link.create.useMutation();

  const shorten = async (url: string) => {
    const link = isLoggedIn
      ? await loggedInMutation.mutateAsync({ url })
      : await anonMutation.mutateAsync({ url });
    const shortUrl = `${projectUrl}${link.short_code}`;
    const autoCopied = await copyToClipboard(shortUrl);
    if (!isLoggedIn) {
      addTempLink({
        url: link.url,
        clicks: link.click_count ?? 0,
        shortUrl,
        expiresAt: link.expires_at,
        shortCode: link.short_code,
        claimToken: link.claim_token,
      });
    }
    setResult({
      shortCode: link.short_code,
      shortUrl,
      url: link.url,
      autoCopied,
      expiresAt: link.expires_at ?? null,
    });
  };

  return (
    <section className="relative w-full">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:repeating-linear-gradient(to_bottom,transparent,transparent_27px,hsl(var(--foreground)/0.045)_28px)] [mask-image:linear-gradient(to_bottom,#000_12%,transparent_90%)]"
      />
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-14 md:grid-cols-12 md:gap-10 md:py-24 lg:gap-16">
        <div className="min-w-0 md:col-span-7">
          <p className="eyebrow desk-rise">
            Free · Open source · On your clipboard
          </p>
          <h1 className="desk-rise mt-4 font-display text-[clamp(3.15rem,7.4vw,6.35rem)] font-medium leading-[0.86] tracking-[-0.04em] [animation-delay:80ms]">
            <span className="block max-w-[9ch]">Paste a long link.</span>
            <span className="mt-2 block italic text-brand">
              Get a short one.
            </span>
          </h1>
          <p className="desk-rise mt-6 max-w-md text-base leading-relaxed text-muted-foreground [animation-delay:160ms] md:text-lg">
            Free and open source. The short link is copied the moment it is
            ready, and you can see who clicks it.
          </p>
          <div
            aria-hidden
            className="desk-rise mt-8 max-w-xl font-mono text-xs [animation-delay:240ms]"
          >
            <div className="flex min-w-0 items-baseline gap-3 border-t border-foreground/15 pt-3">
              <span className="w-14 shrink-0 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Before
              </span>
              <span className="min-w-0 truncate text-muted-foreground line-through decoration-brand/80">
                https://example.com/stories/spring-launch?utm_source=newsletter&id=88421
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-3 border-b border-foreground/15 pb-3">
              <span className="w-14 shrink-0 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                After
              </span>
              <span className="font-display text-4xl italic leading-none tracking-normal text-foreground">
                /spring
              </span>
            </div>
          </div>
        </div>
        <div className="desk-rise min-w-0 [animation-delay:180ms] md:col-span-5">
          <div className="space-y-4">
            <ShortenForm
              size="lg"
              focusOnMount
              capturePaste
              shortcuts={{ slash: true, modK: true }}
              onSubmit={shorten}
              hint="Tip: paste a link anywhere on this page to shorten it."
            />
            {result && (
              <LinkResultCard
                key={result.shortCode}
                shortUrl={result.shortUrl}
                url={result.url}
                autoCopied={result.autoCopied}
                footer={
                  isLoggedIn ? (
                    <Link
                      href="/dashboard"
                      className="flex items-center justify-between border-t border-foreground/10 bg-muted/40 px-5 py-3 text-sm font-medium hover:bg-muted"
                    >
                      See it in your dashboard
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : result.expiresAt ? (
                    <KeepForeverPitch expiresAt={result.expiresAt} />
                  ) : null
                }
              />
            )}
            {!isLoggedIn && <LinkStackView excludeCode={result?.shortCode} />}
          </div>
        </div>
      </div>
    </section>
  );
}
