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

type Result = {
  shortCode: string;
  shortUrl: string;
  url: string;
  autoCopied: boolean;
};

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
      });
    }
    setResult({
      shortCode: link.short_code,
      shortUrl,
      url: link.url,
      autoCopied,
    });
  };

  return (
    <section className="w-full py-16 md:py-28">
      <div className="container px-4">
        <div className="flex flex-col items-center gap-10 text-center">
          <div className="space-y-4">
            <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Paste a long link.{" "}
              <span className="text-muted-foreground">Get a short one.</span>
            </h1>
            <p className="mx-auto max-w-[560px] text-balance text-base text-muted-foreground md:text-lg">
              Free and open source. Your short link is copied the moment
              it&apos;s ready, and you can see who clicks it.
            </p>
          </div>
          <div className="w-full max-w-xl space-y-4">
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
                      className="flex items-center justify-between border-t border-border bg-muted/50 px-5 py-3 text-sm font-medium hover:bg-muted"
                    >
                      See it in your dashboard
                      <ArrowRight className="h-4 w-4" />
                    </Link>
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
