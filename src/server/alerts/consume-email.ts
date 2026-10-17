import { z } from "zod";

import { cloudflareAlertEmailSender } from "./cloudflare-sender";
import { deliverAlertEmail } from "./deliver";

const alertEmailMessageSchema = z.object({
  kind: z.literal("alert-email"),
  alertId: z.string().min(1),
});

export async function consumeAlertEmailMessage(body: unknown) {
  const parsed = alertEmailMessageSchema.safeParse(body);
  if (!parsed.success) return "invalid" as const;
  return deliverAlertEmail(parsed.data.alertId, cloudflareAlertEmailSender());
}
