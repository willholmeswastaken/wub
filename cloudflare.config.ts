import { bindings, defineConfig, defineWorker } from "cf/config";

const secret = () => bindings.secret();

export default defineConfig({
  worker: defineWorker({
    name: "wub",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-01",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    env: {
      ASSETS: bindings.assets(),
      DATABASE_URL: secret(),
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
    },
  }),
});
