"use client";

import {
  AlertRuleDialog,
  type AlertLinkOption,
} from "@/components/alert-rule-dialog";
import { Button } from "@/components/ui/button";
import { WAKE_QUIET_DAYS } from "@/lib/alert-rules";
import { cn } from "@/lib/utils";
import { type AlertRouterOutputs } from "@/server/api/routers/alert";
import { api } from "@/trpc/react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

type Rule = AlertRouterOutputs["rules"][number];
type Delivery = AlertRouterOutputs["delivery"];

export function NotificationSettings({
  initialRules,
  initialDelivery,
  links,
}: {
  initialRules: Rule[];
  initialDelivery: Delivery;
  links: AlertLinkOption[];
}) {
  const utils = api.useUtils();
  const { data: rules } = api.alert.rules.useQuery(undefined, {
    initialData: initialRules,
  });
  const { data: delivery } = api.alert.delivery.useQuery(undefined, {
    initialData: initialDelivery,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const setEmail = api.alert.setEmailEnabled.useMutation({
    onSuccess: async (next) => {
      utils.alert.delivery.setData(undefined, next);
      toast.success(next.emailEnabled ? "Email alerts on" : "Email alerts off");
    },
  });
  const pause = api.alert.pause.useMutation({ onSuccess: refresh });
  const resume = api.alert.resume.useMutation({ onSuccess: refresh });
  const reset = api.alert.reset.useMutation({ onSuccess: refresh });
  const remove = api.alert.delete.useMutation({
    onSuccess: async () => {
      toast.success("Alert deleted");
      await refresh();
    },
  });

  async function refresh() {
    await utils.alert.rules.invalidate();
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-12 md:px-8 md:py-16">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/alerts" className="hover:text-foreground">
              Alerts
            </Link>
          </p>
          <h1 className="mt-2 text-4xl font-medium tracking-[-0.05em] sm:text-5xl">
            Notifications
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground md:text-base">
            Rules for your links, and whether wub emails you when one fires.
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-5xl font-medium tabular-nums leading-none tracking-[-0.06em] sm:text-6xl">
            {rules.length.toLocaleString()}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {rules.length === 1 ? "rule" : "rules"}
          </p>
        </div>
      </div>

      <div className="mt-14 border-t border-border/80 pt-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-lg font-medium tracking-[-0.02em]">Delivery</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One switch for every alert. The feed still records them when this
              is off.
            </p>
            <p className="mt-3 text-sm">
              {delivery.email ? (
                <>
                  Sent to <span className="font-medium">{delivery.email}</span>
                </>
              ) : (
                "Your GitHub account has no email on file."
              )}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={delivery.emailEnabled}
            aria-label="Email alerts"
            disabled={setEmail.isPending || !delivery.email}
            onClick={() => setEmail.mutate({ enabled: !delivery.emailEnabled })}
            className={cn(
              "relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
              delivery.emailEnabled ? "bg-foreground" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-6 w-6 rounded-full bg-background shadow-sm transition-transform",
                delivery.emailEnabled ? "left-5" : "left-0.5",
              )}
            />
          </button>
        </div>
      </div>

      <div className="mt-12 border-t border-border/80 pt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium tracking-[-0.02em]">Rules</h2>
          <Button
            type="button"
            size="sm"
            onClick={() => setDialogOpen(true)}
            disabled={links.length === 0}
          >
            Add alert
          </Button>
        </div>
        {links.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Shorten a link first, then you can alert on it.
          </p>
        ) : rules.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            No rules yet. Add a milestone or a {WAKE_QUIET_DAYS}-day wake-up.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border/80 border-t border-border/80">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-medium tracking-[-0.02em]">
                    /{rule.shortCode}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {ruleLabel(rule)}
                    <span aria-hidden className="px-1.5">
                      ·
                    </span>
                    {statusLabel(rule)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {rule.status === "active" && (
                    <RuleButton onClick={() => pause.mutate(rule.id)}>
                      Pause
                    </RuleButton>
                  )}
                  {rule.status === "paused" && (
                    <RuleButton onClick={() => resume.mutate(rule.id)}>
                      Resume
                    </RuleButton>
                  )}
                  {rule.status === "fired" && rule.type === "milestone" && (
                    <RuleButton onClick={() => reset.mutate(rule.id)}>
                      Reset
                    </RuleButton>
                  )}
                  <RuleButton
                    destructive
                    onClick={() => remove.mutate(rule.id)}
                  >
                    Delete
                  </RuleButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <AlertRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        links={links}
      />
    </section>
  );
}

function ruleLabel(rule: Rule) {
  if (rule.type === "wakeup") return `Wake-up · ${WAKE_QUIET_DAYS} days`;
  return `Milestone · ${(rule.threshold ?? 0).toLocaleString()}`;
}

function statusLabel(rule: Rule) {
  if (rule.status === "paused") return "Paused";
  if (rule.status === "fired") return "Fired";
  if (rule.type === "wakeup" && rule.lastFiredAt) return "Watching";
  return "Active";
}

function RuleButton({
  children,
  onClick,
  destructive = false,
}: {
  children: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
