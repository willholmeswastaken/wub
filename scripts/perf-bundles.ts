import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
/**
 * Summarise the vinext Cloudflare build.
 *
 *   SKIP_ENV_VALIDATION=1 bun run build
 *   bun scripts/perf-bundles.ts
 *
 * Worker size is every JS module under
 * .cloudflare/output/v0/workers/default/bundle except the ssr/ copy
 * (that copy is not a second upload). Gzip is the same bytes concatenated.
 * Client route sizes walk the client Vite manifest: shared layout chunks,
 * plus that route's client entry and its static imports. Dynamic imports
 * that are other routes are not included.
 */
import { gzipSync } from "node:zlib";

const root = path.resolve(import.meta.dirname, "..");
const workerBundle = path.join(
  root,
  ".cloudflare/output/v0/workers/default/bundle",
);
const clientRoot = path.join(
  root,
  ".cloudflare/output/v0/workers/default/assets",
);
const manifestPath = path.join(clientRoot, ".vite/manifest.json");

type ManifestEntry = {
  file: string;
  name?: string;
  src?: string;
  isEntry?: boolean;
  imports?: string[];
  dynamicImports?: string[];
};

const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<
  string,
  ManifestEntry
>;

function walkJs(directory: string, skipSsr: boolean): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (skipSsr && entry.name === "ssr") continue;
      files.push(...walkJs(full, skipSsr));
    } else if (entry.name.endsWith(".js")) {
      files.push(full);
    }
  }
  return files;
}

function fileSize(file: string) {
  return statSync(file).size;
}

const workerFiles = walkJs(workerBundle, true).sort();
const workerBytes = Buffer.concat(
  workerFiles.map((file) => readFileSync(file)),
);
const workerLargest = workerFiles
  .map((file) => ({
    file: path.relative(workerBundle, file),
    bytes: fileSize(file),
  }))
  .sort((a, b) => b.bytes - a.bytes)
  .slice(0, 12);

function clientFile(relative: string) {
  return path.join(clientRoot, relative);
}

const fileBytes = new Map<string, { bytes: number; gzip: number }>();
function sizeOfChunk(relativeFile: string) {
  const cached = fileBytes.get(relativeFile);
  if (cached) return cached;
  const bytes = readFileSync(clientFile(relativeFile));
  const measured = { bytes: bytes.length, gzip: gzipSync(bytes).length };
  fileBytes.set(relativeFile, measured);
  return measured;
}

function closure(entryKey: string, seen = new Set<string>()) {
  const entry = manifest[entryKey];
  if (!entry || seen.has(entryKey)) return seen;
  seen.add(entryKey);
  for (const imported of entry.imports ?? []) closure(imported, seen);
  return seen;
}

const sharedKeys = [
  "virtual:vinext-app-browser-entry",
  "src/components/providers.tsx",
  "src/components/app-chrome.tsx",
  "src/components/header-links.tsx",
  "src/components/theme-toggle.tsx",
  "src/components/ui/sonner.tsx",
  "src/components/guest-link-claimer.tsx",
];

const routes: Record<string, string[]> = {
  "/": ["src/components/hero.tsx"],
  "/dashboard": ["src/components/links-view.tsx"],
  "/analytics/:code": [
    "src/components/clicks-chart.tsx",
    "src/components/breakdown-card.tsx",
    "src/components/link-actions.tsx",
  ],
  "/signin": ["src/components/sign-in-panel.tsx"],
};

function sum(keys: Iterable<string>) {
  let bytes = 0;
  let gzip = 0;
  const files: string[] = [];
  for (const key of keys) {
    const entry = manifest[key];
    if (!entry) continue;
    const measured = sizeOfChunk(entry.file);
    bytes += measured.bytes;
    gzip += measured.gzip;
    files.push(entry.file);
  }
  return { bytes, gzip, files: files.length };
}

const shared = new Set<string>();
for (const key of sharedKeys) closure(key, shared);

const routeReport = Object.fromEntries(
  Object.entries(routes).map(([route, keys]) => {
    const chunks = new Set(shared);
    for (const key of keys) closure(key, chunks);
    return [route, sum(chunks)];
  }),
);

const named = Object.values(manifest)
  .map((entry) => ({
    name: entry.name ?? entry.src ?? entry.file,
    ...sizeOfChunk(entry.file),
  }))
  .sort((a, b) => b.bytes - a.bytes)
  .slice(0, 15);

console.log(
  JSON.stringify(
    {
      worker: {
        files: workerFiles.length,
        rawBytes: workerBytes.length,
        gzipBytes: gzipSync(workerBytes).length,
        largest: workerLargest,
      },
      clientShared: sum(shared),
      routes: routeReport,
      largestClientChunks: named,
    },
    null,
    2,
  ),
);
