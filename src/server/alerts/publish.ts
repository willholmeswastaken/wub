import { env } from "@/env";
import { resolveQueueProvider } from "@/server/queue/provider";

import { deliverAlertEmail } from "./deliver";
import { alertEmailSenderFrom } from "./sender";
import { type PendingAlertEmail } from "./types";

export async function publishAlertEmails(alerts: readonly PendingAlertEmail[]) {
  if (alerts.length === 0) return;
  if (resolveQueueProvider(env.QUEUE_PROVIDER) === "cloudflare") {
    const { enqueueAlertEmails } = await import("./cloudflare-email-queue");
    await enqueueAlertEmails(alerts);
    return;
  }

  // QStash is the non-Worker queue. Email Service is a Workers binding, so
  // the alert is kept and the email is marked unconfigured.
  const sender = alertEmailSenderFrom({ from: undefined, binding: undefined });
  for (const alert of alerts) {
    await deliverAlertEmail(alert.alertId, sender);
  }
}
