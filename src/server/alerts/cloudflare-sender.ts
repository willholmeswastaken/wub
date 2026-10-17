import { env as workersEnv } from "cloudflare:workers";

import { alertEmailSenderFrom, type EmailBinding } from "./sender";

type EmailEnv = {
  EMAIL?: EmailBinding;
  ALERT_EMAIL_FROM?: string;
};

export function cloudflareAlertEmailSender() {
  const env = workersEnv as EmailEnv;
  const from = env.ALERT_EMAIL_FROM || process.env.ALERT_EMAIL_FROM;
  return alertEmailSenderFrom({
    from:
      from && from !== "unconfigured" && from.includes("@") ? from : undefined,
    binding: env.EMAIL,
  });
}
