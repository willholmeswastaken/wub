"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  parseUrl,
  shortenErrorMessage,
  validateDestinationUrl,
} from "@/lib/url";
import { useId, useState, type FormEvent } from "react";

export function ShortenForm({
  onSubmit,
}: {
  onSubmit: (url: string) => Promise<unknown>;
}) {
  const inputId = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const validationMessage = validateDestinationUrl(value);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError(null);
    setIsPending(true);
    try {
      await onSubmit(parseUrl(value.trim()));
      setValue("");
    } catch (submitError) {
      setError(shortenErrorMessage(submitError));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form className="w-full text-left" onSubmit={handleSubmit}>
      <label htmlFor={inputId} className="text-sm font-medium">
        URL
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 space-y-2">
          <Input
            id={inputId}
            value={value}
            placeholder="https://willholmes.dev"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(null);
            }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>
          {isPending ? (
            <Spinner size="small" className="h-4 w-4 text-primary-foreground" />
          ) : (
            "Shorten"
          )}
        </Button>
      </div>
    </form>
  );
}
