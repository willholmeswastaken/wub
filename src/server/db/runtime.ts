import { env } from "@/env";
import { Effect, type Layer, ManagedRuntime } from "effect";

import { AppDatabase, type DatabaseError } from "./database";
import { type DatabaseProvider, resolveDatabaseProvider } from "./provider";
import {
  type ClickSummary,
  type LinkRecord,
  type LinkSnapshot,
  type GuestLinkClaim,
  type NewLink,
} from "./types";

type DatabaseLayer = Layer.Layer<AppDatabase, never, never>;
type DatabaseRuntime = ManagedRuntime.ManagedRuntime<AppDatabase, never>;

let databaseLayerPromise: Promise<DatabaseLayer> | undefined;
let databaseRuntimePromise: Promise<DatabaseRuntime> | undefined;

export function getDatabaseProvider(): DatabaseProvider {
  return resolveDatabaseProvider(env.DATABASE_PROVIDER);
}

export function getDatabaseLayer() {
  databaseLayerPromise ??= (async () => {
    try {
      return getDatabaseProvider() === "cloudflare"
        ? (await import("./cloudflare")).CloudflareAppDatabaseLive
        : (await import("./neon")).NeonAppDatabaseLive;
    } catch (cause) {
      databaseLayerPromise = undefined;
      throw cause;
    }
  })();
  return databaseLayerPromise;
}

export function getDatabaseRuntime() {
  databaseRuntimePromise ??= getDatabaseLayer()
    .then((layer) => ManagedRuntime.make(layer))
    .catch((cause: unknown) => {
      databaseRuntimePromise = undefined;
      throw cause;
    });
  return databaseRuntimePromise;
}

function run<A>(effect: Effect.Effect<A, DatabaseError, AppDatabase>) {
  return getDatabaseRuntime().then((runtime) =>
    runtime.runPromise(
      effect.pipe(
        Effect.catchTag("DatabaseError", (error) => Effect.die(error.cause)),
      ),
    ),
  );
}

export function getAuthAdapter() {
  return getDatabaseRuntime().then((runtime) =>
    runtime.runPromise(
      AppDatabase.use((database) => Effect.succeed(database.adapter)),
    ),
  );
}

export function findLinkByCode(code: string) {
  return run(AppDatabase.use((database) => database.findLinkByCode(code)));
}

export function listTempLinks(codes: string[]) {
  return run(AppDatabase.use((database) => database.listTempLinks(codes)));
}

export function listUserLinks(userId: string) {
  return run(AppDatabase.use((database) => database.listUserLinks(userId)));
}

export function updateLinkUrl(code: string, userId: string, url: string) {
  return run(
    AppDatabase.use((database) => database.updateLinkUrl(code, userId, url)),
  );
}

export function deleteUserLink(code: string, userId: string) {
  return run(
    AppDatabase.use((database) => database.deleteUserLink(code, userId)),
  );
}

export function findLinkSnapshot(code: string) {
  return run(AppDatabase.use((database) => database.findLinkSnapshot(code)));
}

export function listClicksSince(code: string, since: Date) {
  return run(
    AppDatabase.use((database) => database.listClicksSince(code, since)),
  );
}

export function countClicksBetween(code: string, from: Date, until: Date) {
  return run(
    AppDatabase.use((database) =>
      database.countClicksBetween(code, from, until),
    ),
  );
}

export function insertLink(link: NewLink) {
  return run(AppDatabase.use((database) => database.insertLink(link)));
}

export function claimGuestLinks(
  userId: string,
  claims: readonly GuestLinkClaim[],
) {
  return run(
    AppDatabase.use((database) => database.claimGuestLinks(userId, claims)),
  );
}

export type { ClickSummary, LinkRecord, LinkSnapshot };
