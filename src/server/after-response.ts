import { AsyncLocalStorage } from "node:async_hooks";

import logger from "@/server/logger";
import { after } from "next/server";

type WaitUntil = (promise: Promise<unknown>) => void;

const requestWaitUntil = new AsyncLocalStorage<WaitUntil>();

export function withWaitUntil<T>(waitUntil: WaitUntil, run: () => T): T {
  return requestWaitUntil.run(waitUntil, run);
}

export function afterResponse(task: () => Promise<unknown>) {
  const guarded = Promise.resolve()
    .then(task)
    .catch((error: unknown) => {
      logger.info(
        {
          message:
            error instanceof Error ? error.message : "background task failed",
        },
        "Background task failed",
      );
    });
  const waitUntil = requestWaitUntil.getStore();
  if (waitUntil) {
    waitUntil(guarded);
    return;
  }
  after(() => guarded);
}
