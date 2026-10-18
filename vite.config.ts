import path from "node:path";
import { fileURLToPath } from "node:url";

import { cloudflare } from "@cloudflare/vite-plugin";
import vinext from "vinext";
import { defineConfig, type Plugin } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const fallbackStub = path.resolve(root, "src/server/worker-stubs/fallback.ts");
const pinoStub = path.resolve(root, "src/server/worker-stubs/pino.ts");

const localFallbacks: Record<string, string> = {
  [path.resolve(root, "src/server/db/neon.ts")]: fallbackStub,
  [path.resolve(root, "src/server/rate-limit/upstash.ts")]: fallbackStub,
  [path.resolve(root, "src/server/queue/qstash.ts")]: fallbackStub,
};

const packageFallbacks = new Set([
  "@neondatabase/serverless",
  "@upstash/qstash",
  "@upstash/qstash/nextjs",
  "@upstash/ratelimit",
  "@upstash/redis",
]);

// The deployed Worker always selects the Cloudflare database, queue, and rate
// limiter (see cloudflare.config.ts). Neon, Upstash, and pino stay available
// on Node, but they are not part of the Worker upload. The Worker logger
// writes JSON itself and never calls pino.
function workerFallbackStubs(): Plugin {
  return {
    name: "wub-worker-fallback-stubs",
    apply: "build",
    enforce: "pre",
    resolveId(source, importer) {
      if (source === "pino") return pinoStub;
      if (packageFallbacks.has(source)) return fallbackStub;
      if (!importer || !source.startsWith(".")) return null;
      const resolved = path.resolve(path.dirname(importer), source);
      const withExtension = resolved.endsWith(".ts")
        ? resolved
        : `${resolved}.ts`;
      return localFallbacks[withExtension] ?? null;
    },
  };
}

export default defineConfig({
  plugins: [
    workerFallbackStubs(),
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
