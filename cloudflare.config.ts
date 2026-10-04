import { bindings, defineConfig, defineWorker, triggers } from "cf/config";

import { findKvNamespaceId } from "./scripts/find-kv-namespace.js";
import { linksKvTitle } from "./scripts/kv-namespace-id.js";

const secret = () => bindings.secret();

// Workers Builds sets this to the connected Worker. cf keeps an explicit name
// instead, so the deploy name check fails when the dashboard Worker differs.
const workerName = process.env.WRANGLER_CI_OVERRIDE_NAME || "wub";
const linksKvId =
  process.env.LINKS_KV_ID?.trim() ||
  findKvNamespaceId({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    title: linksKvTitle(workerName),
  });

export default defineConfig({
  worker: defineWorker({
    name: workerName,
    entrypoint: "./src/worker.ts",
    compatibilityDate: "2026-10-01",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    observability: { enabled: true },
    // One click is one message. Deliver it immediately: the defaults wait for
    // 10 messages or 5 seconds before the consumer increments click_count.
    triggers: [
      triggers.queue({
        name: "wub-log-clicks",
        maxBatchSize: 1,
        maxBatchTimeout: 0,
      }),
      triggers.scheduled({ schedule: "0 * * * *" }),
    ],
    env: {
      ASSETS: bindings.assets(),
      DATABASE_PROVIDER: bindings.text("cloudflare"),
      DB: bindings.d1({ name: "wub" }),
      LINKS: bindings.kv(linksKvId ? { id: linksKvId } : {}),
      CLICK_ANALYTICS: bindings.analyticsEngineDataset({ name: "wub_clicks" }),
      ANALYTICS: bindings.analyticsSQL(),
      NEXTAUTH_SECRET: secret(),
      NEXTAUTH_URL: secret(),
      GITHUB_CLIENT_ID: secret(),
      GITHUB_CLIENT_SECRET: secret(),
      CLICK_QUEUE: bindings.queue({ name: "wub-log-clicks" }),
      // Keep in sync with the Upstash windows in src/server/rate-limit/upstash.ts.
      LINK_RATE_LIMITER: bindings.rateLimit({
        namespace: "1001",
        simple: { limit: 10, period: 10 },
      }),
      REDIRECT_RATE_LIMITER: bindings.rateLimit({
        namespace: "1002",
        simple: { limit: 100, period: 10 },
      }),
    },
  }),
});
