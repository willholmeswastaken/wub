import { WAKE_QUIET_DAYS } from "@/lib/alert-rules";

import { type AlertEmailClaim } from "./types";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function alertEmailContent(
  alert: Pick<
    AlertEmailClaim,
    "shortCode" | "type" | "threshold" | "clickCount"
  >,
  links: { analyticsUrl: string; unsubscribeUrl: string },
) {
  const code = alert.shortCode;
  const clicks = alert.clickCount.toLocaleString("en-US");
  const subject =
    alert.type === "milestone"
      ? `${code} reached ${(alert.threshold ?? alert.clickCount).toLocaleString("en-US")} clicks`
      : `${code} woke up`;
  const lead =
    alert.type === "milestone"
      ? `${code} has been opened ${clicks} times.`
      : `${code} was opened after ${WAKE_QUIET_DAYS} quiet days. It has ${clicks} clicks.`;
  const text = [
    lead,
    "",
    `View analytics: ${links.analyticsUrl}`,
    "",
    `Turn off email alerts: ${links.unsubscribeUrl}`,
  ].join("\n");
  const html = `<p>${escapeHtml(lead)}</p>
<p><a href="${escapeHtml(links.analyticsUrl)}">View analytics</a></p>
<p><a href="${escapeHtml(links.unsubscribeUrl)}">Turn off email alerts</a></p>`;
  return { subject, text, html };
}
