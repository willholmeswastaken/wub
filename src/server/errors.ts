import { Data } from "effect";

export class Unauthorized extends Data.TaggedError("Unauthorized")<{
  readonly message?: string;
}> {}

export class NotFound extends Data.TaggedError("NotFound")<{
  readonly message?: string;
}> {}

export class RateLimited extends Data.TaggedError("RateLimited")<{
  readonly message?: string;
}> {}

export class ExpiredLink extends Data.TaggedError("ExpiredLink")<{
  readonly message?: string;
}> {}

export class ShortCodeCollision extends Data.TaggedError("ShortCodeCollision")<{
  readonly message?: string;
}> {}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly cause: unknown;
  readonly message?: string;
}> {}

export type AppError =
  | Unauthorized
  | NotFound
  | RateLimited
  | ExpiredLink
  | ShortCodeCollision
  | DatabaseError;
