import { env } from "@/env";
import {
  claimAlertEmail,
  evaluateClickAlerts,
  settleAlertEmail,
} from "@/server/db";
import logger from "@/server/logger";

import { alertEmailContent } from "./email-content";
import { type AlertEmailSender } from "./sender";
import { type PendingAlertEmail } from "./types";
import { signUnsubscribeToken } from "./unsubscribe-token";

export const ALERT_EMAIL_QUEUE = "wub-alert-email";

export function alertLinks(shortCode: string, unsubscribeToken: string) {
  const base = env.NEXTAUTH_URL.replace(/\/$/, "");
  return {
    analyticsUrl: `${base}/analytics/${encodeURIComponent(shortCode)}`,
    unsubscribeUrl: `${base}/alerts/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`,
  };
}

async function renderClaim(alert: PendingAlertEmail) {
  const secret = env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required to sign unsubscribe links");
  }
  const token = await signUnsubscribeToken(alert.userId, secret);
  const content = alertEmailContent(alert, alertLinks(alert.shortCode, token));
  return {
    to: alert.email,
    subject: content.subject,
    text: content.text,
    html: content.html,
  };
}

export async function deliverAlertEmail(
  alertId: string,
  sender: AlertEmailSender,
) {
  const claim = await claimAlertEmail(alertId);
  if (!claim) return "skipped" as const;
  if (!sender.configured) {
    logger.info(
      { alertId, shortCode: claim.shortCode },
      "Alert email left unconfigured; set EMAIL and ALERT_EMAIL_FROM",
    );
    await settleAlertEmail(alertId, "unconfigured");
    return "unconfigured" as const;
  }
  try {
    const message = await renderClaim(claim);
    await sender.send(message);
    await settleAlertEmail(alertId, "sent");
    return "sent" as const;
  } catch (error) {
    await settleAlertEmail(alertId, "pending");
    throw error;
  }
}

export async function dispatchClickAlerts(
  eventId: string,
  publish: (alerts: PendingAlertEmail[]) => Promise<void>,
) {
  const pending = await evaluateClickAlerts(eventId);
  const toSend: PendingAlertEmail[] = [];
  for (const alert of pending) {
    if (alert.emailEnabled && alert.email) {
      toSend.push(alert);
      continue;
    }
    await settleAlertEmail(alert.alertId, "skipped");
  }
  if (toSend.length > 0) await publish(toSend);
}
