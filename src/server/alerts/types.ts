import {
  type AlertEmailState,
  type AlertRuleStatus,
  type AlertType,
} from "@/lib/alert-rules";

export type AlertRuleRecord = {
  id: string;
  shortCode: string;
  url: string;
  type: AlertType;
  threshold: number | null;
  status: AlertRuleStatus;
  lastFiredAt: Date | null;
  createdAt: Date;
};

export type NewAlertRule = {
  id: string;
  userId: string;
  shortCode: string;
  type: AlertType;
  threshold: number | null;
};

export type CreateAlertRuleResult =
  | { ok: true; rule: AlertRuleRecord }
  | { ok: false; reason: "not_found" | "conflict" };

export type AlertFeedItem = {
  id: string;
  shortCode: string;
  url: string | null;
  type: AlertType;
  threshold: number | null;
  clickCount: number;
  createdAt: Date;
  readAt: Date | null;
};

export type EmailDelivery = {
  email: string | null;
  emailEnabled: boolean;
};

export type PendingAlertEmail = {
  alertId: string;
  userId: string;
  email: string;
  emailEnabled: boolean;
  shortCode: string;
  type: AlertType;
  threshold: number | null;
  clickCount: number;
};

export type AlertEmailClaim = PendingAlertEmail;

export type { AlertEmailState };
