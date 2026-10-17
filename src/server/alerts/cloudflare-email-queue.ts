import { env as workersEnv } from "cloudflare:workers";

import { type PendingAlertEmail } from "./types";

type AlertEmailQueueBinding = {
  send(body: { kind: "alert-email"; alertId: string }): Promise<unknown>;
};

export async function enqueueAlertEmails(alerts: readonly PendingAlertEmail[]) {
  const queue = (workersEnv as { ALERT_EMAIL_QUEUE?: AlertEmailQueueBinding })
    .ALERT_EMAIL_QUEUE;
  if (!queue) {
    throw new Error("ALERT_EMAIL_QUEUE binding is missing");
  }
  for (const alert of alerts) {
    await queue.send({ kind: "alert-email", alertId: alert.alertId });
  }
}
