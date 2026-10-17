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
      // Alert email is a second queue so SMTP never sits on the click consumer.
      triggers.queue({
        name: "wub-alert-email",
        maxBatchSize: 10,
        maxBatchTimeout: 1,
        maxRetries: 5,
      }),
      triggers.scheduled({ schedule: "0 * * * *" }),
    ],
    env: {
      ASSETS: bindings.assets(),
      DATABASE_PROVIDER: bindings.text("cloudflare"),
      DB: bindings.d1({ name: "wub" }),
      LINKS: bindings.kv(linksKvId ? { id: linksKvId } : {}),
      NEXTAUTH_SECRET: secret(),
      NEXTAUTH_URL: secret(),
      GITHUB_CLIENT_ID: secret(),
      GITHUB_CLIENT_SECRET: secret(),
      CLICK_QUEUE: bindings.queue({ name: "wub-log-clicks" }),
      ALERT_EMAIL_QUEUE: bindings.queue({ name: "wub-alert-email" }),
      // Unrestricted send_email binding. With Email Sending enabled on Workers
      // Paid and an onboarded From domain, this can reach arbitrary recipients.
      // Without that, Cloudflare only delivers to verified routing destinations.
      EMAIL: bindings.sendEmail(),
      // Baked at build time so a missing secret does not fail Workers Builds.
      // Set ALERT_EMAIL_FROM in the build environment to the onboarded address
      // (alerts@yourdomain). "unconfigured" skips sending and keeps the alert.
      ALERT_EMAIL_FROM: bindings.text(
        process.env.ALERT_EMAIL_FROM?.trim() || "unconfigured",
      ),
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
