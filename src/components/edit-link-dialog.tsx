"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { parseUrl, validateDestinationUrl } from "@/lib/url";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";

export function EditLinkDialog({
  shortCode,
  shortUrl,
  url,
  open,
  onOpenChange,
}: {
  shortCode: string;
  shortUrl: string;
  url: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md sm:rounded-2xl">
        {open && (
          <EditLinkForm
            shortCode={shortCode}
            shortUrl={shortUrl}
            url={url}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditLinkForm({
  shortCode,
  shortUrl,
  url,
  onDone,
}: {
  shortCode: string;
  shortUrl: string;
  url: string;
  onDone: () => void;
}) {
  const inputId = useId();
  const errorId = useId();
  const [value, setValue] = useState(url);
  const [error, setError] = useState<string | null>(null);
  const utils = api.useUtils();
  const router = useRouter();
  const update = api.link.update.useMutation({
    onSuccess: async () => {
      toast.success("Destination updated");
      onDone();
      router.refresh();
      await utils.link.getUserLinks.invalidate();
    },
    onError: () => setError("Could not update that link. Try again."),
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = validateDestinationUrl(value);
    if (problem) {
      setError(problem);
      return;
    }
    const next = parseUrl(value.trim());
    if (next === url) {
      onDone();
      return;
    }
    update.mutate({ shortCode, url: next });
  };

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Edit destination</DialogTitle>
        <DialogDescription className="break-all">
          {shortUrl.replace(/^https?:\/\//, "")} will send people here. Your
          analytics are kept.
        </DialogDescription>
      </DialogHeader>
      <div>
        <label htmlFor={inputId} className="sr-only">
          Destination URL
        </label>
        <Input
          id={inputId}
          value={value}
          type="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
        />
        {error && (
          <p id={errorId} className="mt-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? (
            <Spinner size="small" className="h-4 w-4 text-primary-foreground" />
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </form>
  );
}
