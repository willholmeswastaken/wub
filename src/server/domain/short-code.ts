export const SHORT_CODE_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export const SHORT_CODE_LENGTH = 8;
export const MAX_SHORT_CODE_ATTEMPTS = 8;

export function generateShortCode(
  randomBytes: (size: number) => Uint8Array = defaultRandomBytes,
): string {
  const bytes = randomBytes(SHORT_CODE_LENGTH);
  return Array.from(
    bytes,
    (byte) => SHORT_CODE_CHARS[byte % SHORT_CODE_CHARS.length],
  ).join("");
}

export function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function defaultRandomBytes(size: number) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
}
