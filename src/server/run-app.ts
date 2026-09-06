import { type AppError } from "@/server/errors";
import { appRuntime } from "@/server/runtime";
import { toTrpcError } from "@/server/trpc-error";
import { TRPCError } from "@trpc/server";
import { Cause, Effect, Exit, Option } from "effect";

export { toTrpcError };

export async function runTrpc<A, E extends AppError, R>(
  effect: Effect.Effect<A, E, R>,
): Promise<A> {
  const exit = await appRuntime.runPromiseExit(
    effect as Effect.Effect<A, E, never>,
  );
  return Exit.match(exit, {
    onSuccess: (value) => value,
    onFailure: (cause) => {
      const failure = Cause.failureOption(cause);
      if (Option.isSome(failure)) {
        throw toTrpcError(failure.value);
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: Cause.pretty(cause),
      });
    },
  });
}

export async function runApp<A, E, R>(
  effect: Effect.Effect<A, E, R>,
): Promise<Exit.Exit<A, E>> {
  return appRuntime.runPromiseExit(effect as Effect.Effect<A, E, never>);
}
