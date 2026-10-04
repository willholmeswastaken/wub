/**
 * Pick the D1 database UUID out of `cf d1 list` JSON.
 * The CLI prints either the result array or the API envelope.
 *
 * @param {unknown} payload
 * @param {string} name
 * @returns {string}
 */
export function databaseIdFromList(payload, name) {
  const rows = listRows(payload).filter((row) => row.name === name);
  if (rows.length !== 1) {
    throw new Error(
      `Expected one D1 database named ${name}, found ${rows.length}. Set D1_DATABASE_ID to the database UUID.`,
    );
  }
  const id = rows[0]?.uuid ?? rows[0]?.id;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`D1 database ${name} did not include a uuid.`);
  }
  return id;
}

/**
 * Bind an existing D1 database by id. The dashboard stores `database_id`.
 * A name-only binding is a destructive config change, and `cf deploy` aborts
 * on that in CI.
 *
 * @param {string | undefined} databaseId
 * @param {string} name
 * @returns {{ id: string } | { name: string }}
 */
export function d1BindingOptions(databaseId, name) {
  const id = databaseId?.trim();
  if (id) return { id };
  return { name };
}

/**
 * @param {unknown} payload
 * @returns {Array<{ name?: string, uuid?: string, id?: string }>}
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
