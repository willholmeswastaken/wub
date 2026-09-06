"use client";

import { FormField } from "@/components/form-field";
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
import { Spinner } from "@/components/ui/spinner";
import { mutationErrorMessage } from "@/lib/mutation-error";
import { getProjectUrl } from "@/lib/project-url";
import { parseUrl } from "@/lib/url";
import { type links } from "@/server/db/schema";
import { api } from "@/trpc/react";
import copy from "clipboard-copy";
import { type InferSelectModel } from "drizzle-orm";
import { GlobeIcon } from "lucide-react";
import { useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";

type UrlInput = {
  url: string;
};

export function CreateLink() {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();
  const createLinkMutate = api.link.create.useMutation({
    onSuccess: async (link: InferSelectModel<typeof links>) => {
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
      setOpen(false);
    },
    onError: (error) => {
      toast.error(mutationErrorMessage(error, "Unable to create short link"));
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UrlInput>();

  const onSubmit: SubmitHandler<UrlInput> = ({ url }) => {
    createLinkMutate.mutate({ url: parseUrl(url) });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Link</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center space-x-2">
            <div className="rounded-full bg-muted p-2">
              <GlobeIcon className="h-6 w-6" />
            </div>
            <span>Create a new link</span>
          </DialogTitle>
        </DialogHeader>
        <form
          className="flex w-full flex-col items-start gap-3"
          onSubmit={handleSubmit(onSubmit)}
        >
          <FormField
            id="create-url"
            label="Destination URL"
            error={errors.url ? "Please enter a URL" : undefined}
          >
            <Input
              id="create-url"
              placeholder="https://willholmes.dev"
              aria-invalid={errors.url ? true : undefined}
              {...register("url", { required: true })}
            />
          </FormField>
          <DialogFooter className="w-full pt-2">
            <Button
              type="submit"
              className="w-full"
              disabled={createLinkMutate.isPending}
            >
              Create Link
              <Spinner
                className="ml-2 h-4 w-4 text-primary-foreground"
                show={createLinkMutate.isPending}
              />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
