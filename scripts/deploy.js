import { spawnSync } from "node:child_process";

import { databaseIdFromList } from "./d1-database-id.js";
import { patchBuildOutputD1 } from "./patch-d1-binding.js";

const databaseName = "wub";
const migrationsDir = "migrations/d1";

const databaseId = resolveDatabaseId();
// The build output is what `cf deploy --prebuilt` uploads. Rewrite its D1
// binding to the UUID the dashboard already has.
const patched = patchBuildOutputD1(process.cwd(), databaseId);
if (patched === 0) {
  console.error(
    "The build output has no D1 binding to update. Build the Worker before deploying.",
  );
  process.exit(1);
}
const deployEnv = { ...process.env, D1_DATABASE_ID: databaseId };
delete deployEnv.WRANGLER_CI_MATCH_TAG;
run(
  "cf",
  ["d1", "migrations", "apply", databaseId, "--dir", migrationsDir],
  deployEnv,
);
run("cf", ["deploy", "--prebuilt", "--mode", "production"], deployEnv);

function resolveDatabaseId() {
  const configured = process.env.D1_DATABASE_ID?.trim();
  if (configured) return configured;

  const listed = spawnSync("cf", ["d1", "list", "--name", databaseName], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  if (listed.status !== 0) {
    if (listed.error) console.error(listed.error.message);
    exitWith(listed.status);
  }
  try {
    return databaseIdFromList(JSON.parse(listed.stdout), databaseName);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {NodeJS.ProcessEnv} [commandEnv]
 */
function run(command, args, commandEnv) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: commandEnv,
  });
  if (result.status !== 0) {
    if (result.error) console.error(result.error.message);
    exitWith(result.status);
  }
}

/** @param {number | null} status */
function exitWith(status) {
  process.exit(status ?? 1);
}
