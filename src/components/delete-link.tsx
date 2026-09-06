"use client";

import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { mutationErrorMessage } from "@/lib/mutation-error";
import { getProjectUrl } from "@/lib/project-url";
import { useLinkStore } from "@/stores/link";
import { api } from "@/trpc/react";
import { GlobeIcon } from "lucide-react";
import { type Dispatch, type SetStateAction } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";

type UrlInput = {
  url: string;
};

export function DeleteLink({
  shortCode,
  isOpen,
  setIsOpen,
}: {
  shortCode: string;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const expectedDeletionLink = `${getProjectUrl(false)}${shortCode}`;
  const utils = api.useUtils();
  const deleteLinkFromCache = useLinkStore((state) => state.deleteLink);

  const deleteLink = api.link.deleteLink.useMutation({
    onSuccess: async () => {
      await utils.link.getUserLinks.refetch();
      toast.success("Link deleted successfully!");
      reset();
      deleteLinkFromCache(shortCode);
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error(mutationErrorMessage(error, "Unable to delete link"));
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<UrlInput>();

  const onSubmit: SubmitHandler<UrlInput> = ({ url }) => {
    if (url !== expectedDeletionLink) {
      setError("url", { message: "URL does not match" });
      return;
    }
    deleteLink.mutate(shortCode);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex flex-col items-center justify-center space-x-2 text-lg font-medium">
            <div className="rounded-full bg-muted p-2">
              <GlobeIcon className="h-6 w-6" />
            </div>
            <span>Delete {expectedDeletionLink}</span>
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            Deleting this link removes its analytics. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex w-full flex-col items-start gap-3"
          onSubmit={handleSubmit(onSubmit)}
        >
          <FormField
            id="delete-url"
            label={`Type ${expectedDeletionLink} to confirm`}
            error={errors.url?.message}
          >
            <Input
              id="delete-url"
              aria-invalid={errors.url ? true : undefined}
              {...register("url", { required: true })}
            />
          </FormField>
          <DialogFooter className="w-full pt-2">
            <Button
              variant="destructive"
              type="submit"
              className="w-full"
              disabled={deleteLink.isPending}
            >
              Confirm delete
              <Spinner
                className="ml-2 h-4 w-4 text-destructive-foreground"
                show={deleteLink.isPending}
              />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
