import { describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { bindD1Database, patchBuildOutputD1 } from "./patch-d1-binding.js";

const databaseId = "5196f204-ee51-4051-8da1-7d181bee101d";

describe("bindD1Database", () => {
  test("replaces a name-only D1 binding with the existing id", () => {
    const config = {
      env: {
        DB: { type: "d1", name: "wub" },
        OTHER: { type: "kv", id: "ns" },
      },
    };

    expect(bindD1Database(config, databaseId)).toBe(true);
    expect(config.env.DB).toEqual({ type: "d1", id: databaseId });
    expect(config.env.OTHER).toEqual({ type: "kv", id: "ns" });
  });
});

describe("patchBuildOutputD1", () => {
  test("rewrites the prebuilt worker config that cf deploy uploads", () => {
    const root = mkdtempSync(join(tmpdir(), "wub-d1-"));
    const configPath = join(
      root,
      ".cloudflare/output/v0/workers/default/worker.config.json",
    );
    mkdirSync(join(root, ".cloudflare/output/v0/workers/default"), {
      recursive: true,
    });
    writeFileSync(
      configPath,
      JSON.stringify({
        name: "wub",
        env: { DB: { type: "d1", name: "wub" } },
      }),
    );

    try {
      expect(patchBuildOutputD1(root, databaseId)).toBe(1);
      expect(JSON.parse(readFileSync(configPath, "utf8")).env.DB).toEqual({
        type: "d1",
        id: databaseId,
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
