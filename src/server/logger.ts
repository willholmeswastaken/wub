import pino from "pino";

const isWorker =
  typeof navigator !== "undefined" &&
  navigator.userAgent === "Cloudflare-Workers";

type LogBindings = Record<string, unknown>;

type AppLogger = {
  info: (objOrMsg: unknown, msg?: string) => void;
  child: (bindings: LogBindings) => AppLogger;
};

function workerLogger(bindings: LogBindings = {}): AppLogger {
  return {
    info(objOrMsg, msg) {
      if (typeof objOrMsg === "string") {
        console.log(JSON.stringify({ ...bindings, msg: objOrMsg }));
        return;
      }
      console.log(
        JSON.stringify({
          ...bindings,
          ...(objOrMsg && typeof objOrMsg === "object" ? objOrMsg : {}),
          msg,
        }),
      );
    },
    child(extra) {
      return workerLogger({ ...bindings, ...extra });
    },
  };
}

const pinoOptions = {
  level: process.env.PINO_LOG_LEVEL ?? "info",
  base: {
    env: process.env.NODE_ENV,
    revision: process.env.VERCEL_GITHUB_COMMIT_SHA,
  },
};

const createPino =
  typeof pino === "function"
    ? pino
    : (pino as { default?: typeof pino }).default;

const logger: AppLogger =
  isWorker || typeof createPino !== "function"
    ? workerLogger({
        env: process.env.NODE_ENV,
        revision: process.env.VERCEL_GITHUB_COMMIT_SHA,
      })
    : createPino(pinoOptions);

export default logger;
