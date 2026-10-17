import { type ClickRange } from "@/lib/click-date-range";
import {
  type AlertEmailClaim,
  type AlertEmailState,
  type AlertFeedItem,
  type AlertRuleRecord,
  type CreateAlertRuleResult,
  type EmailDelivery,
  type NewAlertRule,
  type PendingAlertEmail,
} from "@/server/alerts/types";
import { type LogClickEvent } from "@/server/queue/schema";
import { Context, Data, type Effect } from "effect";
import { type Adapter } from "next-auth/adapters";

import { type LinkConflictError } from "./conflicts";
import {
  type ClickAnalytics,
  type GuestLinkClaim,
  type LinkRecord,
  type LinkSnapshot,
  type NewLink,
  type RedirectTarget,
  type UpdatedLink,
  type UserLink,
} from "./types";

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly cause: unknown;
}> {}

export class ClickNotFoundError extends Data.TaggedError("ClickNotFoundError")<{
  readonly shortCode: string;
}> {}

export class RecordClickError extends Data.TaggedError("RecordClickError")<{
  readonly cause: unknown;
}> {}

export class AppDatabase extends Context.Service<
  AppDatabase,
  {
    readonly adapter: Adapter;
    readonly findLinkByCode: (
      code: string,
    ) => Effect.Effect<LinkRecord | null, DatabaseError>;
    readonly findRedirectTarget: (
      code: string,
    ) => Effect.Effect<RedirectTarget | null, DatabaseError>;
    readonly listTempLinks: (
      codes: string[],
    ) => Effect.Effect<LinkRecord[], DatabaseError>;
    readonly listUserLinks: (
      userId: string,
    ) => Effect.Effect<UserLink[], DatabaseError>;
    readonly updateLinkUrl: (
      code: string,
      userId: string,
      url: string,
    ) => Effect.Effect<UpdatedLink | null, DatabaseError>;
    readonly deleteUserLink: (
      code: string,
      userId: string,
    ) => Effect.Effect<void, DatabaseError>;
    readonly findLinkSnapshot: (
      code: string,
    ) => Effect.Effect<LinkSnapshot | null, DatabaseError>;
    readonly clickAnalytics: (
      code: string,
      range: ClickRange,
      now?: Date,
    ) => Effect.Effect<ClickAnalytics, DatabaseError>;
    readonly insertLink: (
      link: NewLink,
    ) => Effect.Effect<LinkRecord, DatabaseError | LinkConflictError>;
    readonly claimGuestLinks: (
      userId: string,
      claims: readonly GuestLinkClaim[],
    ) => Effect.Effect<string[], DatabaseError>;
    readonly deleteExpiredGuestLinks: () => Effect.Effect<
      string[],
      DatabaseError
    >;
    readonly recordClick: (
      event: LogClickEvent,
    ) => Effect.Effect<void, ClickNotFoundError | RecordClickError>;
    readonly evaluateClickAlerts: (
      eventId: string,
    ) => Effect.Effect<PendingAlertEmail[], DatabaseError>;
    readonly createAlertRule: (
      rule: NewAlertRule,
    ) => Effect.Effect<CreateAlertRuleResult, DatabaseError>;
    readonly listAlertRules: (
      userId: string,
    ) => Effect.Effect<AlertRuleRecord[], DatabaseError>;
    readonly pauseAlertRule: (
      id: string,
      userId: string,
    ) => Effect.Effect<AlertRuleRecord | null, DatabaseError>;
    readonly resumeAlertRule: (
      id: string,
      userId: string,
    ) => Effect.Effect<AlertRuleRecord | null, DatabaseError>;
    readonly resetAlertRule: (
      id: string,
      userId: string,
    ) => Effect.Effect<AlertRuleRecord | null, DatabaseError>;
    readonly deleteAlertRule: (
      id: string,
      userId: string,
    ) => Effect.Effect<boolean, DatabaseError>;
    readonly listAlerts: (
      userId: string,
    ) => Effect.Effect<AlertFeedItem[], DatabaseError>;
    readonly unreadAlertCount: (
      userId: string,
    ) => Effect.Effect<number, DatabaseError>;
    readonly markAlertRead: (
      id: string,
      userId: string,
    ) => Effect.Effect<void, DatabaseError>;
    readonly markAllAlertsRead: (
      userId: string,
    ) => Effect.Effect<void, DatabaseError>;
    readonly getEmailDelivery: (
      userId: string,
    ) => Effect.Effect<EmailDelivery, DatabaseError>;
    readonly setEmailEnabled: (
      userId: string,
      enabled: boolean,
    ) => Effect.Effect<EmailDelivery, DatabaseError>;
    readonly claimAlertEmail: (
      alertId: string,
    ) => Effect.Effect<AlertEmailClaim | null, DatabaseError>;
    readonly settleAlertEmail: (
      alertId: string,
      state: AlertEmailState,
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("AppDatabase") {}
