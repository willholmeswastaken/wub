"use client";

import { SlugField, type SlugStatus } from "@/components/slug-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { UrlFavicon } from "@/components/url-favicon";
import { slugProblemMessage } from "@/lib/slug";
import {
  hostnameOf,
  parseUrl,
  shortenErrorMessage,
  validateDestinationUrl,
} from "@/lib/url";
import { cn } from "@/lib/utils";
import { ArrowRight, Link2, PencilLine } from "lucide-react";
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
  slugPrefix,
  children,
}: {
  onSubmit: (url: string, options: { slug?: string }) => Promise<unknown>;
  slugPrefix?: string;
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
  const [showSlug, setShowSlug] = useState(false);
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("empty");
  const slugBlocked =
    showSlug && slugStatus !== "empty" && slugStatus !== "available";

  const debouncedValue = useDebounced(value, 250);
  const previewHost =
    debouncedValue && !validateDestinationUrl(debouncedValue)
      ? hostnameOf(debouncedValue)
      : null;

  const submit = useCallback(
    async (raw: string) => {
      if (pendingRef.current) return;
      if (slugBlocked) {
        setError(
          slugStatus === "checking"
            ? "Still checking that short link"
            : slugProblemMessage[slugStatus],
        );
        return;
      }
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
        await onSubmit(parseUrl(raw.trim()), {
          slug: showSlug && slug ? slug : undefined,
        });
        setValue("");
        setSlug("");
      } catch (submitError) {
        setError(shortenErrorMessage(submitError));
      } finally {
        pendingRef.current = false;
        setIsPending(false);
        inputRef.current?.focus();
      }
    },
    [onSubmit, slugBlocked, slugStatus, showSlug, slug],
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
          "flex flex-col gap-2 rounded-[1.75rem] bg-card p-1.5 shadow-[0_0_0_1px_hsl(var(--border))] sm:flex-row sm:items-center sm:gap-1.5 sm:rounded-full",
          isLarge &&
            "shadow-[0_0_0_1px_hsl(var(--border)),0_24px_50px_-28px_hsl(240_10%_4%/0.45)]",
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
              "rounded-full border-0 bg-transparent pl-11 shadow-none focus-visible:ring-0",
              isLarge ? "h-12 text-lg sm:h-14" : "h-11",
            )}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(null);
            }}
          />
        </div>
        <Button
          type="submit"
          className={cn(
            "w-full sm:w-auto",
            isLarge ? "h-12 px-7 text-base sm:h-14" : "h-11",
          )}
          disabled={isPending}
        >
          {isPending ? (
            <Spinner size="small" className="h-4 w-4 text-primary-foreground" />
          ) : (
            <>
              Shorten
              {isLarge && <ArrowRight className="ml-2 h-4 w-4" />}
            </>
          )}
        </Button>
      </div>
      {slugPrefix &&
        (showSlug ? (
          <SlugField
            prefix={slugPrefix}
            value={slug}
            onChange={(next) => {
              setSlug(next);
              if (error) setError(null);
            }}
            onStatusChange={setSlugStatus}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowSlug(true)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md px-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PencilLine className="h-3.5 w-3.5" />
            Customise short link
          </button>
        ))}
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
