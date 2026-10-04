"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useClaimableLinks, useHydrated } from "@/stores/link";
import { Check, Github } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";

const errorMessages: Record<string, string> = {
  OAuthAccountNotLinked:
    "That email is already linked to another sign-in method.",
  AccessDenied: "Access was denied. Try again or use a different account.",
  Callback: "GitHub didn't finish signing you in. Try again.",
};

export function SignInPanel({
  callbackUrl,
  error,
}: {
  callbackUrl: string;
  error?: string;
}) {
  const hydrated = useHydrated();
  const claimable = useClaimableLinks();
  const [isPending, setIsPending] = useState(false);
  const linkCount = hydrated ? claimable.length : 0;

  const errorMessage = error
    ? (errorMessages[error] ?? "Something went wrong signing in. Try again.")
    : null;

  return (
    <section className="flex flex-1 items-center px-4 py-16 md:py-24">
      <div className="mx-auto grid w-full max-w-5xl items-end gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:gap-16">
        <div>
          <p className="eyebrow">Account</p>
          <h1 className="mt-4 max-w-[10ch] font-display text-[clamp(3rem,6vw,5.4rem)] font-medium leading-[0.88] tracking-[-0.04em]">
            Sign in. <span className="italic text-brand">Keep the mark.</span>
          </h1>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-muted-foreground">
            GitHub is the only key. Your links stay, and you can see who clicks
            them.
          </p>
        </div>
        <div className="slip p-6 sm:p-8">
          <p className="eyebrow">Clerk&apos;s window</p>
          {linkCount > 0 && (
            <p className="mt-5 flex items-start gap-2 border border-foreground/10 bg-brand/[0.06] p-3 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <span>
                Your {linkCount === 1 ? "link" : `${linkCount} links`} from this
                browser will be saved to your account.
              </span>
            </p>
          )}
          {errorMessage && (
            <p
              role="alert"
              className="mt-5 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {errorMessage}
            </p>
          )}
          <Button
            className="mt-6 w-full"
            disabled={isPending}
            onClick={() => {
              setIsPending(true);
              void signIn("github", { callbackUrl }).catch(() =>
                setIsPending(false),
              );
            }}
          >
            {isPending ? (
              <Spinner
                size="small"
                className="h-4 w-4 text-primary-foreground"
              />
            ) : (
              <>
                <Github className="mr-2 h-4 w-4" />
                Continue with GitHub
              </>
            )}
          </Button>
          <p className="mt-4 font-mono text-[11px] uppercase leading-relaxed tracking-[0.14em] text-muted-foreground">
            Name, email and avatar. Nothing else.
          </p>
        </div>
      </div>
    </section>
  );
}
