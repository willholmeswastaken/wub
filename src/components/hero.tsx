"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Spinner } from "./ui/spinner";
import { toast } from "sonner";
import copy from "clipboard-copy";
import { parseUrl } from "@/lib/url";
import LinkStackView from "./link-stack-view";
import { useLinkStore } from "@/stores/link";
import { type InferInsertModel } from "drizzle-orm";
import { type links } from "@/server/db/schema";
import { getProjectUrl } from "@/lib/project-url";

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

  const onShortLinkSuccess = (link: InferInsertModel<typeof links>) => {
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
      clicks: link.click_count!,
      shortUrl: shortLink,
      expiresAt: link.expires_at,
      shortCode: link.short_code,
    });
    setValue("url", "");
  };

  const { mutate: anonMutate, isPending: anonMutatePending } =
    api.link.createAnon.useMutation({
      onSuccess(link) {
        onShortLinkSuccess(link);
      },
    });
  const { mutate: loggedInMutate, isPending: loggedInMutatePending } =
    api.link.create.useMutation({
      onSuccess(link) {
        onShortLinkSuccess(link);
      },
    });

  const onSubmit: SubmitHandler<UrlInput> = ({ url }) => {
    // @ts-expect-error its ok
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    document.activeElement?.blur();
    const parsedUrl = parseUrl(url);
    if (isLoggedIn) {
      loggedInMutate({ url: parsedUrl });
    } else {
      anonMutate({ url: parsedUrl });
    }
  };

  return (
    <section className="w-full py-12 md:py-20">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="space-y-2">
            <h1 className="max-w-2xl text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
              Short Links That Change The World
            </h1>
            <p className="mx-auto max-w-[525px] text-gray-500 dark:text-gray-400 md:text-xl">
              Wub is the open-source link shortener that is built to scale.
            </p>
          </div>
          <div className="w-full max-w-lg space-y-2">
            <div className="flex flex-col space-y-6">
              <form
                className="flex space-x-2"
                onSubmit={handleSubmit(onSubmit)}
              >
                <Input
                  className="max-w-lg flex-1 text-base"
                  placeholder="https://willholmes.dev"
                  {...register("url", { required: true })}
                />

                <Button type="submit" className="w-20">
                  {anonMutatePending || loggedInMutatePending ? (
                    <Spinner size="small" className="text-white" />
                  ) : (
                    "Shorten"
                  )}
                </Button>
              </form>
              {errors.url && (
                <span className="pl-1 text-left text-sm text-red-600">
                  Please enter a url
                </span>
              )}
              <LinkStackView />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
