"use client";

import { Logo } from "@/components/logo";
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
    <section className="flex flex-1 items-center justify-center px-4 py-16 md:py-24">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-8 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <Logo />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          Sign in to Wub
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Keep your links forever and see who clicks them.
        </p>
        {linkCount > 0 && (
          <p className="mt-6 flex items-start gap-2 rounded-xl bg-brand/5 p-3 text-sm">
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
            className="mt-6 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
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
            <Spinner size="small" className="h-4 w-4 text-primary-foreground" />
          ) : (
            <>
              <Github className="mr-2 h-4 w-4" />
              Continue with GitHub
            </>
          )}
        </Button>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          We only use your GitHub name, email and avatar.
        </p>
      </div>
    </section>
  );
}
