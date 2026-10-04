import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

/**
 * cf copies `delivery_delay` onto the dashboard queue producer even when the
 * API omitted it. json-diff then records `delivery_delay__deleted: undefined`,
 * which strict mode treats as destructive, while the printed diff only shows
 * empty producer braces.
 */
export const QUEUE_PRODUCER_WITH_UNDEFINED_DELAY =
  "{binding:t.name,queue:t.queue_name,delivery_delay:t.delivery_delay}";

export const QUEUE_PRODUCER_OMIT_UNDEFINED_DELAY =
  "{binding:t.name,queue:t.queue_name,...(t.delivery_delay!==void 0?{delivery_delay:t.delivery_delay}:{})}";

/**
 * @param {string} source
 * @returns {string}
 */
export function patchQueueProducerSource(source) {
  if (source.includes(QUEUE_PRODUCER_OMIT_UNDEFINED_DELAY)) return source;
  if (!source.includes(QUEUE_PRODUCER_WITH_UNDEFINED_DELAY)) {
    throw new Error(
      "The installed cf CLI no longer builds queue producers the way this deploy workaround expects. Refusing to deploy, because strict mode would abort on an empty producer diff.",
    );
  }
  return source.replaceAll(
    QUEUE_PRODUCER_WITH_UNDEFINED_DELAY,
    QUEUE_PRODUCER_OMIT_UNDEFINED_DELAY,
  );
}

/**
 * Patch the installed cf bundle before `cf deploy` compares dashboard config.
 *
 * @param {string} [root]
 * @returns {string[]} files that contain the queue producer builder
 */
export function patchInstalledCfQueueProducer(root = process.cwd()) {
  const require = createRequire(join(root, "package.json"));
  const packageJson = require.resolve("cf/package.json");
  const distDir = join(packageJson, "..", "dist");
  const patched = [];

  for (const name of readdirSync(distDir)) {
    if (!name.endsWith(".mjs")) continue;
    const file = join(distDir, name);
    const source = readFileSync(file, "utf8");
    if (
      !source.includes(QUEUE_PRODUCER_WITH_UNDEFINED_DELAY) &&
      !source.includes(QUEUE_PRODUCER_OMIT_UNDEFINED_DELAY)
    ) {
      continue;
    }
    const next = patchQueueProducerSource(source);
    if (next !== source) writeFileSync(file, next);
    patched.push(file);
  }

  if (patched.length === 0) {
    throw new Error(
      "Could not find cf's queue producer builder. Refusing to deploy, because strict mode would abort on an empty producer diff.",
    );
  }
  return patched;
}
