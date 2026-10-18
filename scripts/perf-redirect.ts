/**
 * Redirect latency against the built Cloudflare worker.
 *
 *   SKIP_ENV_VALIDATION=1 bun run build
 *   bun scripts/perf-redirect.ts
 *
 * Boots the vinext worker bundle in Miniflare with D1, KV, and the rate-limit
 * binding, seeds one link, then times GET /popular (cache miss, then hits).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { applyD1Schema } from "@/server/db/schema-sql";
import { Miniflare } from "miniflare";

const root = path.resolve(import.meta.dirname, "..");
const bundle = path.join(root, ".cloudflare/output/v0/workers/default/bundle");

function walk(
  directory: string,
  base = directory,
): Record<string, { type: "esm"; contents: string }> {
  const modules: Record<string, { type: "esm"; contents: string }> = {};
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "ssr") continue;
      Object.assign(modules, walk(full, base));
    } else if (entry.name.endsWith(".js")) {
      const key = path.relative(base, full).split(path.sep).join("/");
      modules[key] = { type: "esm", contents: readFileSync(full, "utf8") };
    }
  }
  return modules;
}

function percentile(samples: number[], ratio: number) {
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(ratio * sorted.length));
  return Math.round((sorted[index] ?? 0) * 100) / 100;
}

async function time(label: string, runs: number, fn: () => Promise<void>) {
  const samples: number[] = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    await fn();
    samples.push(performance.now() - start);
  }
  return {
    label,
    runs,
    meanMs:
      Math.round(
        (samples.reduce((sum, sample) => sum + sample, 0) / samples.length) *
          100,
      ) / 100,
    p50Ms: percentile(samples, 0.5),
    p95Ms: percentile(samples, 0.95),
    minMs: percentile(samples, 0),
  };
}

if (!statSync(path.join(bundle, "index.js"), { throwIfNoEntry: false })) {
  console.error(
    "Missing worker bundle. Run: SKIP_ENV_VALIDATION=1 bun run build",
  );
  process.exit(1);
}

const modules = walk(bundle);
const miniflare = new Miniflare({
  workers: [
    {
      config: {
        name: "wub",
        compatibilityDate: "2026-10-01",
        compatibilityFlags: ["nodejs_compat"],
        manifest: { mainModule: "index.js", modules },
        env: {
          DATABASE_PROVIDER: { type: "text", value: "cloudflare" },
          DB: { type: "d1", name: "wub" },
          LINKS: { type: "kv" },
          NEXTAUTH_SECRET: {
            type: "text",
            value: "dev-secret-dev-secret-dev-secret",
          },
          NEXTAUTH_URL: { type: "text", value: "http://localhost" },
          GITHUB_CLIENT_ID: { type: "text", value: "dev" },
          GITHUB_CLIENT_SECRET: { type: "text", value: "dev" },
          CLICK_QUEUE: { type: "queue", name: "wub-log-clicks" },
          REDIRECT_RATE_LIMITER: {
            type: "rate-limit",
            namespace: "1002",
            simple: { limit: 100000, period: 10 },
          },
          LINK_RATE_LIMITER: {
            type: "rate-limit",
            namespace: "1001",
            simple: { limit: 100000, period: 10 },
          },
        },
      },
    },
  ],
});

try {
  const ready = await miniflare.ready;
  console.error("miniflare ready", String(ready));
  const worker = await miniflare.getWorker();
  const d1 = await miniflare.getD1Database("DB");
  await applyD1Schema((query) => d1.exec(query));
  await d1
    .prepare(
      `INSERT INTO wub_link (short_code, url, created_at, click_count) VALUES (?1, ?2, ?3, 0)`,
    )
    .bind("popular", "https://example.com/perf", Date.now())
    .run();

  const miss = await worker.fetch("http://localhost/popular", {
    headers: { "user-agent": "Mozilla/5.0 perf" },
    redirect: "manual",
  });
  const missLocation = miss.headers.get("location");

  const hit = await time("redirect cache hit", 50, async () => {
    const response = await worker.fetch("http://localhost/popular", {
      headers: { "user-agent": "Mozilla/5.0 perf" },
      redirect: "manual",
    });
    if (response.status !== miss.status) {
      throw new Error(`status ${response.status}`);
    }
    await response.arrayBuffer();
  });

  const missSamples: number[] = [];
  for (let i = 0; i < 20; i++) {
    const code = `c${Math.random().toString(36).slice(2, 10)}`;
    await d1
      .prepare(
        `INSERT INTO wub_link (short_code, url, created_at, click_count) VALUES (?1, ?2, ?3, 0)`,
      )
      .bind(code, "https://example.com/perf", Date.now())
      .run();
    const start = performance.now();
    const response = await worker.fetch(`http://localhost/${code}`, {
      headers: { "user-agent": "Mozilla/5.0 perf" },
      redirect: "manual",
    });
    missSamples.push(performance.now() - start);
    if (!response.headers.get("location")) {
      throw new Error(
        `missing location ${response.status} ${await response.text()}`,
      );
    }
  }
  const cold = {
    label: "redirect cache miss",
    runs: missSamples.length,
    meanMs:
      Math.round(
        (missSamples.reduce((sum, sample) => sum + sample, 0) /
          missSamples.length) *
          100,
      ) / 100,
    p50Ms: percentile(missSamples, 0.5),
    p95Ms: percentile(missSamples, 0.95),
    minMs: percentile(missSamples, 0),
  };

  console.log(
    JSON.stringify(
      {
        first: { status: miss.status, location: missLocation },
        hit,
        cold,
      },
      null,
      2,
    ),
  );
} finally {
  await miniflare.dispose();
}
