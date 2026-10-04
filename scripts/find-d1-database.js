import { spawnSync } from "node:child_process";

import { databaseIdFromList } from "./d1-database-id.js";

/**
 * Resolve the D1 UUID while the Worker config is being evaluated.
 * `cf deploy --prebuilt` uploads the config captured at build time.
 *
 * @param {{ accountId?: string, apiToken?: string, name: string }} options
 * @returns {string | undefined}
 */
export function findD1DatabaseId({ accountId, apiToken, name }) {
  const account = accountId?.trim();
  const token = apiToken?.trim();
  if (!account || !token) return undefined;

  const listed = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", listDatabasesSource],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 20_000,
      env: {
        ...process.env,
        D1_LOOKUP_ACCOUNT_ID: account,
        D1_LOOKUP_API_TOKEN: token,
        D1_LOOKUP_NAME: name,
      },
    },
  );
  if (listed.status !== 0) return undefined;
  try {
    return databaseIdFromList(JSON.parse(listed.stdout || "[]"), name);
  } catch {
    return undefined;
  }
}

const listDatabasesSource = `
const accountId = process.env.D1_LOOKUP_ACCOUNT_ID;
const token = process.env.D1_LOOKUP_API_TOKEN;
const name = process.env.D1_LOOKUP_NAME;
const rows = [];
for (let page = 1; page <= 20; page++) {
  const url = new URL(
    "https://api.cloudflare.com/client/v4/accounts/" +
      accountId +
      "/d1/database",
  );
  url.searchParams.set("name", name);
  url.searchParams.set("per_page", "100");
  url.searchParams.set("page", String(page));
  const response = await fetch(url, {
    headers: { Authorization: "Bearer " + token },
  });
  const body = await response.json();
  if (!response.ok || body.success === false) {
    const message = body.errors?.[0]?.message ?? response.statusText;
    console.error(message);
    process.exit(1);
  }
  const batch = Array.isArray(body.result) ? body.result : [];
  rows.push(...batch);
  if (batch.length < 100) break;
}
process.stdout.write(JSON.stringify(rows));
`;
