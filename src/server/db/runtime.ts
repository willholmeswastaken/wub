import { env } from "@/env";
import { type AlertEmailState } from "@/lib/alert-rules";
import { type ClickRange } from "@/lib/click-date-range";
import { type NewAlertRule } from "@/server/alerts/types";
import { TRPCError } from "@trpc/server";
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

function run<A, E>(effect: Effect.Effect<A, E | DatabaseError, AppDatabase>) {
  return getDatabaseRuntime().then((runtime) =>
    runtime.runPromise(
      effect.pipe(
        Effect.catchTag("DatabaseError", () =>
          Effect.die(
            new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Something went wrong",
            }),
          ),
        ),
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

export function findRedirectTarget(code: string) {
  return run(AppDatabase.use((database) => database.findRedirectTarget(code)));
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

export function clickAnalytics(code: string, range: ClickRange, now?: Date) {
  return run(
    AppDatabase.use((database) => database.clickAnalytics(code, range, now)),
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

export function deleteExpiredGuestLinks() {
  return run(AppDatabase.use((database) => database.deleteExpiredGuestLinks()));
}

export function evaluateClickAlerts(eventId: string) {
  return run(
    AppDatabase.use((database) => database.evaluateClickAlerts(eventId)),
  );
}

export function createAlertRule(rule: NewAlertRule) {
  return run(AppDatabase.use((database) => database.createAlertRule(rule)));
}

export function listAlertRules(userId: string) {
  return run(AppDatabase.use((database) => database.listAlertRules(userId)));
}

export function pauseAlertRule(id: string, userId: string) {
  return run(
    AppDatabase.use((database) => database.pauseAlertRule(id, userId)),
  );
}

export function resumeAlertRule(id: string, userId: string) {
  return run(
    AppDatabase.use((database) => database.resumeAlertRule(id, userId)),
  );
}

export function resetAlertRule(id: string, userId: string) {
  return run(
    AppDatabase.use((database) => database.resetAlertRule(id, userId)),
  );
}

export function deleteAlertRule(id: string, userId: string) {
  return run(
    AppDatabase.use((database) => database.deleteAlertRule(id, userId)),
  );
}

export function listAlerts(userId: string) {
  return run(AppDatabase.use((database) => database.listAlerts(userId)));
}

export function unreadAlertCount(userId: string) {
  return run(AppDatabase.use((database) => database.unreadAlertCount(userId)));
}

export function markAlertRead(id: string, userId: string) {
  return run(AppDatabase.use((database) => database.markAlertRead(id, userId)));
}

export function markAllAlertsRead(userId: string) {
  return run(AppDatabase.use((database) => database.markAllAlertsRead(userId)));
}

export function getEmailDelivery(userId: string) {
  return run(AppDatabase.use((database) => database.getEmailDelivery(userId)));
}

export function setEmailEnabled(userId: string, enabled: boolean) {
  return run(
    AppDatabase.use((database) => database.setEmailEnabled(userId, enabled)),
  );
}

export function claimAlertEmail(alertId: string) {
  return run(AppDatabase.use((database) => database.claimAlertEmail(alertId)));
}

export function settleAlertEmail(alertId: string, state: AlertEmailState) {
  return run(
    AppDatabase.use((database) => database.settleAlertEmail(alertId, state)),
  );
}

export type { ClickSummary, LinkRecord, LinkSnapshot };
