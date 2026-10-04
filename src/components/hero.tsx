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
      className="flex items-center justify-between gap-4 border-t border-border/80 px-5 py-3.5 text-sm transition-colors hover:bg-muted/70"
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
    <section className="relative w-full overflow-hidden px-5 pb-24 pt-16 md:pb-32 md:pt-24">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[min(760px,110%)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,hsl(var(--brand)/0.12),transparent_70%)]"
      />
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="space-y-6">
          <p className="text-[13px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Free · Open source
          </p>
          <h1 className="mx-auto max-w-3xl text-balance text-5xl font-medium leading-[0.95] tracking-[-0.05em] sm:text-6xl md:text-7xl">
            Paste a long link.
            <span className="mt-2 block text-muted-foreground">
              Get a short one.
            </span>
          </h1>
          <p className="mx-auto max-w-md text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
            Your short link is copied the moment it&apos;s ready. Sign in when
            you want to see who clicks it.
          </p>
        </div>
        <div className="mt-12 w-full max-w-xl space-y-4">
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
                    className="flex items-center justify-between border-t border-border/80 px-5 py-3.5 text-sm font-medium transition-colors hover:bg-muted/70"
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
    </section>
  );
}
