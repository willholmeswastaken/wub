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
import { WAKE_QUIET_DAYS, type AlertType } from "@/lib/alert-rules";
import { hostnameOf } from "@/lib/url";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";

export type AlertLinkOption = {
  shortCode: string;
  url: string;
};

export function AlertRuleDialog({
  open,
  onOpenChange,
  links,
  presetShortCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: AlertLinkOption[];
  presetShortCode?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md sm:rounded-2xl">
        {open && (
          <AlertRuleForm
            links={links}
            presetShortCode={presetShortCode}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AlertRuleForm({
  links,
  presetShortCode,
  onDone,
}: {
  links: AlertLinkOption[];
  presetShortCode?: string;
  onDone: () => void;
}) {
  const thresholdId = useId();
  const linkId = useId();
  const preset = links.find((link) => link.shortCode === presetShortCode);
  const [shortCode, setShortCode] = useState(
    preset?.shortCode ?? links[0]?.shortCode ?? "",
  );
  const [type, setType] = useState<AlertType>("milestone");
  const [threshold, setThreshold] = useState("1000");
  const [error, setError] = useState<string | null>(null);
  const utils = api.useUtils();
  const create = api.alert.create.useMutation({
    onSuccess: async () => {
      toast.success("Alert saved");
      onDone();
      await Promise.all([
        utils.alert.rules.invalidate(),
        utils.alert.list.invalidate(),
      ]);
    },
    onError: (cause) => {
      setError(cause.message || "Could not save that alert.");
    },
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shortCode) {
      setError("Choose a link first.");
      return;
    }
    const parsed =
      type === "milestone" ? Number.parseInt(threshold, 10) : undefined;
    if (type === "milestone" && (!parsed || parsed < 1)) {
      setError("Enter a click total of at least 1.");
      return;
    }
    setError(null);
    create.mutate({ shortCode, type, threshold: parsed });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <DialogHeader>
        <DialogTitle className="text-xl tracking-[-0.03em]">
          Add alert
        </DialogTitle>
        <DialogDescription>
          A milestone fires once. A wake-up fires after {WAKE_QUIET_DAYS} quiet
          days, then waits for the next quiet stretch.
        </DialogDescription>
      </DialogHeader>
      {preset ? (
        <p className="truncate text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            /{preset.shortCode}
          </span>
          <span className="px-1.5">·</span>
          {hostnameOf(preset.url) ?? preset.url}
        </p>
      ) : (
        <div className="grid gap-2">
          <label htmlFor={linkId} className="text-sm font-medium">
            Link
          </label>
          <select
            id={linkId}
            value={shortCode}
            onChange={(event) => setShortCode(event.target.value)}
            className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {links.length === 0 && <option value="">No links yet</option>}
            {links.map((link) => (
              <option key={link.shortCode} value={link.shortCode}>
                /{link.shortCode}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex rounded-full bg-muted p-1 text-sm">
        <span className="sr-only">Alert type</span>
        {(
          [
            ["milestone", "Milestone"],
            ["wakeup", "Wake-up"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={type === value}
            onClick={() => setType(value)}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              type === value && "bg-background text-foreground shadow-sm",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {type === "milestone" ? (
        <div className="grid gap-2">
          <label htmlFor={thresholdId} className="text-sm font-medium">
            Click total
          </label>
          <Input
            id={thresholdId}
            inputMode="numeric"
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            className="tabular-nums tracking-[-0.04em]"
          />
          <p className="text-sm text-muted-foreground">
            Fires on the click that reaches this total. If the link is already
            there, the next click fires it.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Fires once when this link is opened after {WAKE_QUIET_DAYS} days
          without a click, then arms again the next time it goes quiet.
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={create.isPending || links.length === 0}>
        {create.isPending ? <Spinner /> : "Save alert"}
      </Button>
    </form>
  );
}
