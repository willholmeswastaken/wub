import { describe, expect, it } from "vitest";

import {
  generateShortCode,
  isUniqueViolation,
  SHORT_CODE_CHARS,
  SHORT_CODE_LENGTH,
} from "./short-code";

describe("generateShortCode", () => {
  it("returns an 8-character code from the allowed alphabet", () => {
    const code = generateShortCode();
    expect(code).toHaveLength(SHORT_CODE_LENGTH);
    expect([...code].every((char) => SHORT_CODE_CHARS.includes(char))).toBe(
      true,
    );
  });

  it("maps provided bytes onto the alphabet", () => {
    const bytes = Uint8Array.from([0, 1, 61, 62, 63, 10, 25, 99]);
    const code = generateShortCode(() => bytes);
    expect(code).toBe(
      [
        SHORT_CODE_CHARS[0],
        SHORT_CODE_CHARS[1],
        SHORT_CODE_CHARS[61],
        SHORT_CODE_CHARS[0],
        SHORT_CODE_CHARS[1],
        SHORT_CODE_CHARS[10],
        SHORT_CODE_CHARS[25],
        SHORT_CODE_CHARS[37],
      ].join(""),
    );
  });
});

describe("isUniqueViolation", () => {
  it("detects Postgres unique violations", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation("nope")).toBe(false);
  });
});
