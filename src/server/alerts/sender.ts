export type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

/**
 * One transactional alert email. Cloudflare Email Service is the production
 * implementation; tests and unconfigured workers use the other factories.
 */
export type AlertEmailSender = {
  readonly configured: boolean;
  send(message: OutboundEmail): Promise<void>;
};

export type EmailBinding = {
  send(
    message: OutboundEmail & { from: string },
  ): Promise<{ messageId?: string }>;
};

export class AlertEmailNotConfiguredError extends Error {
  constructor() {
    super(
      "Cloudflare Email Service is not configured (EMAIL binding and ALERT_EMAIL_FROM)",
    );
    this.name = "AlertEmailNotConfiguredError";
  }
}

export function alertEmailSenderFrom(input: {
  from: string | undefined;
  binding: EmailBinding | undefined;
}): AlertEmailSender {
  const from = input.from?.trim();
  if (!from || !input.binding) {
    return {
      configured: false,
      send() {
        return Promise.reject(new AlertEmailNotConfiguredError());
      },
    };
  }
  const binding = input.binding;
  return {
    configured: true,
    async send(message) {
      await binding.send({ ...message, from });
    },
  };
}
