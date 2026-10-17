"use client";

import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { type AlertRouterOutputs } from "@/server/api/routers/alert";
import { api } from "@/trpc/react";
import Link from "next/link";
import { useState } from "react";

type AlertItem = AlertRouterOutputs["list"][number];

export function AlertsFeed({ initialAlerts }: { initialAlerts: AlertItem[] }) {
  const utils = api.useUtils();
  const { data } = api.alert.list.useQuery(undefined, {
    initialData: initialAlerts,
    refetchInterval: 4_000,
    refetchIntervalInBackground: false,
  });
  const markRead = api.alert.markRead.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.alert.list.invalidate(),
        utils.alert.unreadCount.invalidate(),
      ]);
    },
  });
  const markAll = api.alert.markAllRead.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.alert.list.invalidate(),
        utils.alert.unreadCount.invalidate(),
      ]);
    },
  });
  const unread = data.filter((alert) => alert.readAt == null).length;

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-12 md:px-8 md:py-16">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-medium tracking-[-0.05em] sm:text-5xl">
            Alerts
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground md:text-base">
            Milestones and wake-ups land here as they happen.{" "}
            <Link
              href="/settings/notifications"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Manage rules
            </Link>
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-5xl font-medium tabular-nums leading-none tracking-[-0.06em] sm:text-6xl md:text-7xl">
            {unread.toLocaleString()}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">unread</p>
        </div>
      </div>
      {data.length > 0 && (
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={unread === 0 || markAll.isPending}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
          >
            Mark all read
          </button>
        </div>
      )}
      {data.length === 0 ? (
        <div className="mt-16 border-t border-border/80 pt-10">
          <h2 className="text-2xl font-medium tracking-[-0.04em]">
            Nothing fired yet
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Add a milestone or a wake-up from a link, or from notification
            settings. This feed keeps every alert, even when email is off.
          </p>
        </div>
      ) : (
        <div className="mt-4 border-t border-border/80">
          {data.map((alert) => (
            <AlertRow
              key={alert.id}
              alert={alert}
              onMarkRead={() => markRead.mutate(alert.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function AlertRow({
  alert,
  onMarkRead,
}: {
  alert: AlertItem;
  onMarkRead: () => void;
}) {
  const [pending, setPending] = useState(false);
  const unread = alert.readAt == null;
  const title =
    alert.type === "milestone"
      ? `/${alert.shortCode} reached ${(alert.threshold ?? alert.clickCount).toLocaleString()}`
      : `/${alert.shortCode} woke up`;

  return (
    <div className="group relative flex items-center gap-4 border-b border-border/80 py-5 md:px-4">
      <Link
        href={`/analytics/${alert.shortCode}`}
        onClick={() => {
          if (unread) onMarkRead();
        }}
        className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="sr-only">View analytics for /{alert.shortCode}</span>
      </Link>
      <span
        aria-hidden
        className={cn(
          "relative h-2 w-2 shrink-0 rounded-full",
          unread ? "bg-foreground" : "bg-transparent",
        )}
      />
      <div className="pointer-events-none relative min-w-0 flex-1">
        <p className="truncate text-base font-medium tracking-[-0.02em]">
          {title}
        </p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          <span className="tabular-nums">
            {alert.clickCount.toLocaleString()}
          </span>{" "}
          {alert.clickCount === 1 ? "click" : "clicks"}
          <span aria-hidden className="px-1.5">
            ·
          </span>
          {relativeTime(alert.createdAt)}
          {alert.type === "wakeup" && (
            <>
              <span aria-hidden className="px-1.5">
                ·
              </span>
              after a quiet stretch
            </>
          )}
        </p>
      </div>
      {unread && (
        <button
          type="button"
          onClick={() => {
            setPending(true);
            onMarkRead();
          }}
          disabled={pending}
          className="relative z-10 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Mark read
        </button>
      )}
    </div>
  );
}
