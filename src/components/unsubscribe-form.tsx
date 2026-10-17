"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/trpc/react";
import Link from "next/link";
import { useState } from "react";

export function UnsubscribeForm({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const unsubscribe = api.alert.unsubscribe.useMutation({
    onSuccess: () => setDone(true),
  });

  return (
    <section className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-24">
      <h1 className="text-4xl font-medium tracking-[-0.05em]">Email alerts</h1>
      {done ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Email alerts are off. Fired alerts still show up when you are signed
          in.{" "}
          <Link
            href="/settings/notifications"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Turn them back on
          </Link>
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            This turns off alert email for your wub account. You can turn it
            back on from notification settings.
          </p>
          {unsubscribe.error && (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {unsubscribe.error.message}
            </p>
          )}
          <Button
            type="button"
            className="mt-8 w-fit"
            disabled={!token || unsubscribe.isPending}
            onClick={() => unsubscribe.mutate({ token })}
          >
            {unsubscribe.isPending ? <Spinner /> : "Turn off email alerts"}
          </Button>
        </>
      )}
    </section>
  );
}
