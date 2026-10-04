import { bindings, defineConfig, defineWorker, triggers } from "cf/config";

const secret = () => bindings.secret();

// Workers Builds sets this to the connected Worker. cf keeps an explicit name
// instead, so the deploy name check fails when the dashboard Worker differs.
const workerName = process.env.WRANGLER_CI_OVERRIDE_NAME || "wub";

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
    ],
    env: {
      ASSETS: bindings.assets(),
      DATABASE_PROVIDER: bindings.text("cloudflare"),
      DB: bindings.d1({ name: "wub" }),
      NEXTAUTH_SECRET: secret(),
      NEXTAUTH_URL: secret(),
      GITHUB_CLIENT_ID: secret(),
      GITHUB_CLIENT_SECRET: secret(),
      LOGFLARE_API_KEY: secret(),
      LOGFLARE_SOURCE_ID: secret(),
      UPSTASH_REDIS_REST_URL: secret(),
      UPSTASH_REDIS_REST_TOKEN: secret(),
      QSTASH_URL: secret(),
      QSTASH_TOKEN: secret(),
      QSTASH_CURRENT_SIGNING_KEY: secret(),
      QSTASH_NEXT_SIGNING_KEY: secret(),
      CLICK_QUEUE: bindings.queue({ name: "wub-log-clicks" }),
    },
  }),
});
