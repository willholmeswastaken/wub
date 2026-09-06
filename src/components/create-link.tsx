"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { getProjectUrl } from "@/lib/project-url";
import { parseUrl } from "@/lib/url";
import { type links } from "@/server/db/schema";
import { api } from "@/trpc/react";
import copy from "clipboard-copy";
import { type InferInsertModel } from "drizzle-orm";
import { GlobeIcon } from "lucide-react";
import { useRef } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";

type UrlInput = {
  url: string;
};

export function CreateLink() {
  const dialogTrigger = useRef<HTMLButtonElement | null>(null);
  const utils = api.useUtils();
  const createLinkMutate = api.link.create.useMutation({
    onSuccess: async (link: InferInsertModel<typeof links>) => {
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
      await utils.link.getUserLinks.refetch();
      reset();
      dialogTrigger.current?.click();
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UrlInput>();

  const onSubmit: SubmitHandler<UrlInput> = ({ url }) => {
    const parsedUrl = parseUrl(url);
    createLinkMutate.mutate({ url: parsedUrl });
  };

  return (
    <Dialog>
      <DialogTrigger asChild ref={dialogTrigger}>
        <Button>Create Link</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center space-x-2">
            <div className="rounded-full bg-gray-100 p-2">
              <GlobeIcon className="h-6 w-6" />
            </div>
            <span>Create a new link</span>
          </DialogTitle>
        </DialogHeader>
        <form
          className="flex w-full flex-col items-start gap-1"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Label htmlFor="url" className="text-xs">
            Destination Url
          </Label>
          <Input
            placeholder="https://willholmes.dev"
            className="col-span-3"
            {...register("url", { required: true })}
          />
          {errors.url && (
            <span className="pl-1 text-left text-sm text-red-600">
              {errors.url.message}
            </span>
          )}
          <DialogFooter className="w-full pt-2">
            <Button
              type="submit"
              className="w-full"
              disabled={createLinkMutate.isPending}
            >
              Create Link
              <Spinner
                className="ml-2 h-4 w-4 text-white"
                show={createLinkMutate.isPending}
              />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
