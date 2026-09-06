import { type AppError } from "@/server/errors";
import { TRPCError } from "@trpc/server";

export function toTrpcError(error: AppError): TRPCError {
  switch (error._tag) {
    case "Unauthorized":
      return new TRPCError({
        code: "UNAUTHORIZED",
        message: error.message ?? "Unauthorized",
      });
    case "NotFound":
      return new TRPCError({
        code: "NOT_FOUND",
        message: error.message ?? "Not found",
      });
    case "RateLimited":
      return new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: error.message ?? "Unable to process request",
      });
    case "ExpiredLink":
      return new TRPCError({
        code: "NOT_FOUND",
        message: error.message ?? "Link expired",
      });
    case "ShortCodeCollision":
    case "DatabaseError":
      return new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message ?? "Internal server error",
      });
  }
}
