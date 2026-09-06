"use client";

import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mutationErrorMessage } from "@/lib/mutation-error";
import { getProjectUrl } from "@/lib/project-url";
import { parseUrl } from "@/lib/url";
import { type links } from "@/server/db/schema";
import { useLinkStore } from "@/stores/link";
import { api } from "@/trpc/react";
import copy from "clipboard-copy";
import { type InferSelectModel } from "drizzle-orm";
import Link from "next/link";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";

import LinkStackView from "./link-stack-view";
import { Spinner } from "./ui/spinner";

type UrlInput = {
  url: string;
};

export function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  const addTempLink = useLinkStore((state) => state.addLink);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<UrlInput>();

  const onShortLinkSuccess = (link: InferSelectModel<typeof links>) => {
    const shortLink = `${getProjectUrl()}${link.short_code}`;
    toast.success("Short link created!", {
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
      clicks: link.click_count,
      shortUrl: shortLink,
      expiresAt: link.expires_at,
      shortCode: link.short_code,
    });
    setValue("url", "");
  };

  const onError = (error: unknown) => {
    toast.error(mutationErrorMessage(error, "Unable to create short link"));
  };

  const { mutate: anonMutate, isPending: anonMutatePending } =
    api.link.createAnon.useMutation({
      onSuccess: onShortLinkSuccess,
      onError,
    });
  const { mutate: loggedInMutate, isPending: loggedInMutatePending } =
    api.link.create.useMutation({
      onSuccess: onShortLinkSuccess,
      onError,
    });

  const onSubmit: SubmitHandler<UrlInput> = ({ url }) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const parsedUrl = parseUrl(url);
    if (isLoggedIn) {
      loggedInMutate({ url: parsedUrl });
    } else {
      anonMutate({ url: parsedUrl });
    }
  };

  const isPending = anonMutatePending || loggedInMutatePending;

  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.16),transparent_55%)]" />
      <div className="relative container px-4 md:px-6">
        <div className="mx-auto flex max-w-2xl flex-col items-center space-y-8 text-center">
          <div className="space-y-4">
            <p className="text-sm font-medium tracking-wide text-primary uppercase">
              Open-source link shortener
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Short links with room to grow
            </h1>
            <p className="mx-auto max-w-xl text-base text-muted-foreground md:text-lg">
              Paste a URL, get a tracked short link. Guests get 30 minutes. Sign
              in with GitHub to keep links and see analytics.
            </p>
          </div>
          <form
            className="w-full space-y-3 text-left"
            onSubmit={handleSubmit(onSubmit)}
          >
            <FormField
              id="hero-url"
              label="Destination URL"
              error={errors.url ? "Please enter a URL" : undefined}
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="hero-url"
                  className="flex-1 text-base"
                  placeholder="https://willholmes.dev"
                  aria-invalid={errors.url ? true : undefined}
                  aria-describedby={errors.url ? "hero-url-error" : undefined}
                  {...register("url", { required: true })}
                />
                <Button type="submit" className="sm:w-28" disabled={isPending}>
                  {isPending ? (
                    <Spinner size="small" className="text-primary-foreground" />
                  ) : (
                    "Shorten"
                  )}
                </Button>
              </div>
            </FormField>
            {!isLoggedIn ? (
              <p className="text-xs text-muted-foreground">
                Guest links expire after 30 minutes.{" "}
                <Link
                  href="/api/auth/signin"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Create an account
                </Link>{" "}
                to keep them.
              </p>
            ) : null}
          </form>
          <div className="w-full">
            <LinkStackView />
          </div>
        </div>
      </div>
    </section>
  );
}
