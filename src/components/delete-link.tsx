"use client";

import { useProjectUrl } from "@/components/project-url-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useLinkStore } from "@/stores/link";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";

export function DeleteLink({
  shortCode,
  isOpen,
  setIsOpen,
}: {
  shortCode: string;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const shortUrl = `${useProjectUrl()}${shortCode}`;
  const utils = api.useUtils();
  const router = useRouter();
  const deleteLinkFromCache = useLinkStore((state) => state.deleteLink);

  const deleteLink = api.link.deleteLink.useMutation({
    onSuccess: async () => {
      await utils.link.getUserLinks.invalidate();
      deleteLinkFromCache(shortCode);
      toast.success("Link deleted");
      setIsOpen(false);
      router.push("/dashboard");
    },
    onError: () => {
      toast.error("Could not delete that link");
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>Delete link</DialogTitle>
          <DialogDescription>
            Deleting {shortUrl} removes its analytics. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button
            variant="destructive"
            type="button"
            className="w-full"
            disabled={deleteLink.isPending}
            onClick={() => deleteLink.mutate(shortCode)}
          >
            Delete link
            <Spinner
              className="ml-2 h-4 w-4 text-primary-foreground"
              size="small"
              show={deleteLink.isPending}
            />
          </Button>
          <Button
            variant="outline"
            type="button"
            className="w-full"
            disabled={deleteLink.isPending}
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
