import { ClickService, ClickServiceLive } from "@/server/domain/click-service";
import { LinkService, LinkServiceLive } from "@/server/domain/link-service";
import { ClickQueueLive } from "@/server/infra/click-queue";
import { DbLive } from "@/server/infra/db";
import { AppLoggerLive } from "@/server/infra/logger";
import { RateLimiterLive } from "@/server/infra/rate-limiter";
import { Layer, ManagedRuntime } from "effect";

const InfraLive = Layer.mergeAll(
  DbLive,
  AppLoggerLive,
  RateLimiterLive,
  ClickQueueLive,
);

export const AppLive = Layer.mergeAll(LinkServiceLive, ClickServiceLive).pipe(
  Layer.provide(InfraLive),
);

export const appRuntime = ManagedRuntime.make(AppLive);

export { ClickService, LinkService };
