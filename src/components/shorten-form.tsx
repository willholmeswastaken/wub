"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { UrlFavicon } from "@/components/url-favicon";
import {
  hostnameOf,
  parseUrl,
  shortenErrorMessage,
  validateDestinationUrl,
} from "@/lib/url";
import { cn } from "@/lib/utils";
import { Link2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);
  return debounced;
}

export function ShortenForm({
  onSubmit,
  size = "default",
  focusOnMount = false,
  capturePaste = false,
  shortcuts = {},
  hint,
  children,
}: {
  onSubmit: (url: string) => Promise<unknown>;
  size?: "default" | "lg";
  focusOnMount?: boolean;
  capturePaste?: boolean;
  shortcuts?: { slash?: boolean; modK?: boolean };
  hint?: ReactNode;
  children?: ReactNode;
}) {
  const inputId = useId();
  const messageId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const debouncedValue = useDebounced(value, 250);
  const previewHost =
    debouncedValue && !validateDestinationUrl(debouncedValue)
      ? hostnameOf(debouncedValue)
      : null;

  const submit = useCallback(
    async (raw: string) => {
      if (pendingRef.current) return;
      const validationMessage = validateDestinationUrl(raw);
      if (validationMessage) {
        setError(validationMessage);
        inputRef.current?.focus();
        return;
      }

      setError(null);
      pendingRef.current = true;
      setIsPending(true);
      try {
        await onSubmit(parseUrl(raw.trim()));
        setValue("");
      } catch (submitError) {
        setError(shortenErrorMessage(submitError));
      } finally {
        pendingRef.current = false;
        setIsPending(false);
        inputRef.current?.focus();
      }
    },
    [onSubmit],
  );

  useEffect(() => {
    if (!focusOnMount) return;
    if (window.matchMedia("(pointer: fine)").matches) {
      inputRef.current?.focus();
    }
  }, [focusOnMount]);

  useEffect(() => {
    if (!shortcuts.slash && !shortcuts.modK) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const isModK =
        shortcuts.modK &&
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k";
      const isSlash =
        shortcuts.slash &&
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !isEditable(event.target);
      if (!isModK && !isSlash) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcuts.slash, shortcuts.modK]);

  useEffect(() => {
    if (!capturePaste) return;
    const onPaste = (event: ClipboardEvent) => {
      const input = inputRef.current;
      const isOwnInput = event.target === input;
      if (!isOwnInput && isEditable(event.target)) return;
      if (isOwnInput && input && input.value.trim() !== "") return;
      const text = event.clipboardData?.getData("text")?.trim() ?? "";
      if (!text || validateDestinationUrl(text)) return;
      event.preventDefault();
      setValue(text);
      void submit(text);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [capturePaste, submit]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit(value);
  };

  const isLarge = size === "lg";
  const message =
    error ?? (previewHost ? `Shortening a link to ${previewHost}` : hint);

  return (
    <form className="w-full text-left" onSubmit={handleSubmit} noValidate>
      <label htmlFor={inputId} className="sr-only">
        Long URL
      </label>
      <div
        className={cn(
          "flex flex-col gap-2 sm:flex-row sm:items-center",
          isLarge &&
            "rounded-2xl border border-border bg-background p-2 shadow-sm transition-shadow focus-within:shadow-md sm:gap-2",
        )}
      >
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center">
            {previewHost ? (
              <UrlFavicon
                url={`https://${previewHost}`}
                className="h-5 w-5 rounded"
              />
            ) : (
              <Link2 className="h-5 w-5 text-muted-foreground" />
            )}
          </span>
          <Input
            ref={inputRef}
            id={inputId}
            value={value}
            type="url"
            inputMode="url"
            placeholder="Paste a long link"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby={message ? messageId : undefined}
            className={cn(
              "pl-11",
              isLarge &&
                "h-12 border-0 text-lg shadow-none focus-visible:ring-0 sm:h-14",
            )}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(null);
            }}
          />
        </div>
        <Button
          type="submit"
          className={cn("w-full sm:w-auto", isLarge && "h-12 px-8 sm:h-14")}
          disabled={isPending}
        >
          {isPending ? (
            <Spinner size="small" className="h-4 w-4 text-primary-foreground" />
          ) : (
            "Shorten"
          )}
        </Button>
      </div>
      {children}
      <p
        id={messageId}
        aria-live="polite"
        className={cn(
          "mt-2 min-h-5 truncate px-1 text-sm",
          error ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {message}
      </p>
    </form>
  );
}
