import { describe, expect, test } from "bun:test";

import { databaseIdFromList } from "./d1-database-id.js";

describe("databaseIdFromList", () => {
  test("reads the uuid for the named database", () => {
    expect(
      databaseIdFromList(
        [
          { name: "other", uuid: "nope" },
          { name: "wub", uuid: "db-1" },
        ],
        "wub",
      ),
    ).toBe("db-1");
  });

  test("accepts the API envelope", () => {
    expect(
      databaseIdFromList(
        { result: [{ name: "wub", uuid: "db-1" }], success: true },
        "wub",
      ),
    ).toBe("db-1");
  });

  test("falls back to id when uuid is absent", () => {
    expect(databaseIdFromList([{ name: "wub", id: "db-1" }], "wub")).toBe(
      "db-1",
    );
  });

  test("rejects a missing or ambiguous name", () => {
    expect(() => databaseIdFromList([], "wub")).toThrow(/found 0/);
    expect(() =>
      databaseIdFromList(
        [
          { name: "wub", uuid: "a" },
          { name: "wub", uuid: "b" },
        ],
        "wub",
      ),
    ).toThrow(/found 2/);
  });
});
