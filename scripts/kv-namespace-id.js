/**
 * Pick a KV namespace id out of the Cloudflare list API.
 * The payload is either the result array or the API envelope.
 *
 * @param {unknown} payload
 * @param {string} title
 * @returns {string | undefined}
 */
export function kvNamespaceIdFromList(payload, title) {
  const rows = listRows(payload).filter((row) => row.title === title);
  if (rows.length > 1) {
    throw new Error(
      `Expected at most one KV namespace titled ${title}, found ${rows.length}. Set LINKS_KV_ID to the namespace id.`,
    );
  }
  const id = rows[0]?.id;
  if (rows.length === 1 && (typeof id !== "string" || id.length === 0)) {
    throw new Error(`KV namespace ${title} did not include an id.`);
  }
  return id;
}

/** @param {string} workerName */
export function linksKvTitle(workerName) {
  return `${workerName}-links`;
}

/**
 * @param {unknown} payload
 * @returns {Array<{ title?: string, id?: string }>}
 */
function listRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (
    payload !== null &&
    typeof payload === "object" &&
    "result" in payload &&
    Array.isArray(payload.result)
  ) {
    return payload.result;
  }
  return [];
}
