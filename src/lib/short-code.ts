const ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function getShortcode() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let result = "";
  for (const byte of bytes) {
    result += ALPHABET[byte % ALPHABET.length];
  }
  return result;
}
