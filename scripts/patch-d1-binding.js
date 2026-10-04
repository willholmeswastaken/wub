import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * `cf deploy --prebuilt` uploads worker.config.json from the build.
 * Replace a name-only D1 binding with the existing database UUID.
 *
 * @param {unknown} config
 * @param {string} databaseId
 * @returns {boolean} whether a D1 binding was present
 */
export function bindD1Database(config, databaseId) {
  if (config === null || typeof config !== "object") return false;
  const env = /** @type {{ env?: unknown }} */ (config).env;
  if (env === null || typeof env !== "object") return false;

  let found = false;
  for (const binding of Object.values(env)) {
    if (binding === null || typeof binding !== "object") continue;
    if (/** @type {{ type?: unknown }} */ (binding).type !== "d1") continue;
    found = true;
    const record = /** @type {{ id?: string, name?: string }} */ (binding);
    record.id = databaseId;
    delete record.name;
  }
  return found;
}

/**
 * @param {string} root
 * @param {string} databaseId
 * @returns {number} worker configs that contain a D1 binding
 */
export function patchBuildOutputD1(root, databaseId) {
  const workersDir = join(root, ".cloudflare/output/v0/workers");
  if (!existsSync(workersDir)) return 0;

  let found = 0;
  for (const entry of readdirSync(workersDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const configPath = join(workersDir, entry.name, "worker.config.json");
    if (!existsSync(configPath)) continue;
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    if (!bindD1Database(config, databaseId)) continue;
    writeFileSync(configPath, JSON.stringify(config));
    found += 1;
  }
  return found;
}
