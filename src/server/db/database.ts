import { type LogClickEvent } from "@/server/queue/schema";
import { Context, Data, type Effect } from "effect";
import { type Adapter } from "next-auth/adapters";

import {
  type ClickSummary,
  type LinkRecord,
  type LinkSnapshot,
  type NewLink,
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
    readonly listTempLinks: (
      codes: string[],
    ) => Effect.Effect<LinkRecord[], DatabaseError>;
    readonly listUserLinks: (
      userId: string,
    ) => Effect.Effect<LinkRecord[], DatabaseError>;
    readonly deleteUserLink: (
      code: string,
      userId: string,
    ) => Effect.Effect<void, DatabaseError>;
    readonly findLinkSnapshot: (
      code: string,
    ) => Effect.Effect<LinkSnapshot | null, DatabaseError>;
    readonly listClicksSince: (
      code: string,
      since: Date,
    ) => Effect.Effect<ClickSummary[], DatabaseError>;
    readonly insertLink: (
      link: NewLink,
    ) => Effect.Effect<LinkRecord, DatabaseError>;
    readonly recordClick: (
      event: LogClickEvent,
    ) => Effect.Effect<void, ClickNotFoundError | RecordClickError>;
  }
>()("AppDatabase") {}
