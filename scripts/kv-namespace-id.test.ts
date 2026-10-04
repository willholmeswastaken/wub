import { expect, test } from "bun:test";

import { kvNamespaceIdFromList, linksKvTitle } from "./kv-namespace-id.js";

test("links namespace title follows the deploy provision name", () => {
  expect(linksKvTitle("wub")).toBe("wub-links");
});

test("reads the id for the titled namespace", () => {
  expect(
    kvNamespaceIdFromList(
      [
        { title: "other", id: "nope" },
        { title: "wub-links", id: "ns-1" },
      ],
      "wub-links",
    ),
  ).toBe("ns-1");
});

test("accepts the API envelope and a missing namespace", () => {
  expect(
    kvNamespaceIdFromList(
      { result: [{ title: "wub-links", id: "ns-1" }], success: true },
      "wub-links",
    ),
  ).toBe("ns-1");
  expect(kvNamespaceIdFromList({ result: [] }, "wub-links")).toBe(undefined);
});

test("rejects two namespaces with the same title", () => {
  expect(() =>
    kvNamespaceIdFromList(
      [
        { title: "wub-links", id: "a" },
        { title: "wub-links", id: "b" },
      ],
      "wub-links",
    ),
  ).toThrow(/found 2/);
});
