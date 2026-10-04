import { type ClickRange } from "@/lib/click-date-range";
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
  }
>()("AppDatabase") {}
