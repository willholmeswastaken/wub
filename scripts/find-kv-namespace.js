import { spawnSync } from "node:child_process";

import { kvNamespaceIdFromList } from "./kv-namespace-id.js";

/**
 * Reuse a KV namespace that an earlier deploy already created.
 * `cf deploy` does not remember provisioned ids, so a later deploy would
 * try to create the same title and fail with error 10014.
 *
 * @param {{ accountId?: string, apiToken?: string, title: string }} options
 * @returns {string | undefined}
 */
export function findKvNamespaceId({ accountId, apiToken, title }) {
  const account = accountId?.trim();
  const token = apiToken?.trim();
  if (!account || !token) return undefined;

  const listed = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", listNamespacesSource],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 20_000,
      env: {
        ...process.env,
        KV_LOOKUP_ACCOUNT_ID: account,
        KV_LOOKUP_API_TOKEN: token,
      },
    },
  );
  if (listed.status !== 0) {
    const detail = (
      listed.stderr ||
      listed.error?.message ||
      "Could not list KV namespaces"
    ).trim();
    throw new Error(detail);
  }
  return kvNamespaceIdFromList(JSON.parse(listed.stdout || "[]"), title);
}

const listNamespacesSource = `
const accountId = process.env.KV_LOOKUP_ACCOUNT_ID;
const token = process.env.KV_LOOKUP_API_TOKEN;
const rows = [];
for (let page = 1; page <= 20; page++) {
  const url = new URL(
    "https://api.cloudflare.com/client/v4/accounts/" +
      accountId +
      "/storage/kv/namespaces",
  );
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
