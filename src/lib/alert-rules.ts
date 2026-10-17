/** Days of quiet before a wake-up alert fires. Change this one constant. */
export const WAKE_QUIET_DAYS = 7;

export const WAKE_QUIET_MS = WAKE_QUIET_DAYS * 24 * 60 * 60 * 1000;

export const ALERT_TYPES = ["milestone", "wakeup"] as const;

export type AlertType = (typeof ALERT_TYPES)[number];

export const ALERT_RULE_STATUSES = ["active", "paused", "fired"] as const;

export type AlertRuleStatus = (typeof ALERT_RULE_STATUSES)[number];

export const ALERT_EMAIL_STATES = [
  "pending",
  "sending",
  "sent",
  "skipped",
  "unconfigured",
] as const;

export type AlertEmailState = (typeof ALERT_EMAIL_STATES)[number];
