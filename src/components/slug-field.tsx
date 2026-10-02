"use client";

import { slugProblem, slugProblemMessage, type SlugProblem } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { Check } from "lucide-react";
import { useEffect, useId, useState } from "react";

export type SlugStatus = "empty" | "checking" | "available" | SlugProblem;

export function SlugField({
  prefix,
  value,
  onChange,
  onStatusChange,
}: {
  prefix: string;
  value: string;
  onChange: (value: string) => void;
  onStatusChange: (status: SlugStatus) => void;
}) {
  const inputId = useId();
  const messageId = useId();
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), 300);
    return () => window.clearTimeout(timeout);
  }, [value]);

  const localProblem = value ? slugProblem(value) : null;
  const shouldCheck = !!debounced && !slugProblem(debounced);
  const { data, isFetching } = api.link.checkSlug.useQuery(debounced, {
    enabled: shouldCheck,
    staleTime: 10_000,
  });

  let status: SlugStatus;
  if (!value) status = "empty";
  else if (localProblem) status = localProblem;
  else if (debounced !== value || isFetching || !data) status = "checking";
  else status = data.problem ?? "available";

  useEffect(() => {
    onStatusChange(status);
  }, [status, onStatusChange]);

  const message =
    status === "available"
      ? "Available"
      : status === "checking"
        ? "Checking..."
        : status === "empty"
          ? "Leave empty for a random code"
          : slugProblemMessage[status];

  return (
    <div className="mt-2">
      <label htmlFor={inputId} className="sr-only">
        Custom short link
      </label>
      <div className="flex h-11 items-center overflow-hidden rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
        <span className="shrink-0 select-none pl-4 text-sm text-muted-foreground">
          {prefix.replace(/^https?:\/\//, "")}
        </span>
        <input
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value.trim())}
          placeholder="your-link"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          maxLength={32}
          aria-describedby={messageId}
          aria-invalid={
            status !== "available" &&
            status !== "checking" &&
            status !== "empty"
          }
          className="h-full min-w-0 flex-1 bg-transparent pr-4 text-base outline-none"
        />
      </div>
      <p
        id={messageId}
        aria-live="polite"
        className={cn(
          "mt-1 flex items-center gap-1 px-1 text-xs",
          status === "available"
            ? "text-brand"
            : status === "checking" || status === "empty"
              ? "text-muted-foreground"
              : "text-destructive",
        )}
      >
        {status === "available" && <Check className="h-3.5 w-3.5" />}
        {message}
      </p>
    </div>
  );
}
