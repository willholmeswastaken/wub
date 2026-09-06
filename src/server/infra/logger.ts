import logger from "@/server/logger";
import { Context, Layer } from "effect";
import type { Logger } from "pino";

export class AppLogger extends Context.Tag("AppLogger")<AppLogger, Logger>() {}

export const AppLoggerLive = Layer.succeed(AppLogger, logger);
