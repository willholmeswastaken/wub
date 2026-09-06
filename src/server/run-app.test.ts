import { describe, expect, it } from "vitest";

import { DatabaseError, NotFound, RateLimited, Unauthorized } from "./errors";
import { toTrpcError } from "./trpc-error";

describe("toTrpcError", () => {
  it("maps tagged domain errors onto tRPC codes", () => {
    expect(toTrpcError(new Unauthorized({})).code).toBe("UNAUTHORIZED");
    expect(toTrpcError(new NotFound({})).code).toBe("NOT_FOUND");
    expect(toTrpcError(new RateLimited({})).code).toBe("TOO_MANY_REQUESTS");
    expect(
      toTrpcError(new DatabaseError({ cause: new Error("db") })).code,
    ).toBe("INTERNAL_SERVER_ERROR");
  });
});
