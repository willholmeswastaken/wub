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

import {
  QUEUE_PRODUCER_OMIT_UNDEFINED_DELAY,
  QUEUE_PRODUCER_WITH_UNDEFINED_DELAY,
  patchInstalledCfQueueProducer,
  patchQueueProducerSource,
} from "./patch-cf-queue-producer.js";

describe("patchQueueProducerSource", () => {
  test("drops an omitted delivery delay and keeps a real one", () => {
    const source = `producers:[${QUEUE_PRODUCER_WITH_UNDEFINED_DELAY}]`;
    const patched = patchQueueProducerSource(source);

    expect(patched).toContain(QUEUE_PRODUCER_OMIT_UNDEFINED_DELAY);
    expect(patched).not.toContain(QUEUE_PRODUCER_WITH_UNDEFINED_DELAY);

    const producer = new Function(
      "t",
      `return ${QUEUE_PRODUCER_OMIT_UNDEFINED_DELAY}`,
    );
    expect(
      producer({ name: "CLICK_QUEUE", queue_name: "wub-log-clicks" }),
    ).toEqual({
      binding: "CLICK_QUEUE",
      queue: "wub-log-clicks",
    });
    expect(
      producer({
        name: "CLICK_QUEUE",
        queue_name: "wub-log-clicks",
        delivery_delay: 5,
      }),
    ).toEqual({
      binding: "CLICK_QUEUE",
      queue: "wub-log-clicks",
      delivery_delay: 5,
    });
  });

  test("is idempotent", () => {
    const once = patchQueueProducerSource(QUEUE_PRODUCER_WITH_UNDEFINED_DELAY);
    expect(patchQueueProducerSource(once)).toBe(once);
  });

  test("refuses an unrecognized cf bundle", () => {
    expect(() => patchQueueProducerSource("unchanged")).toThrow(
      /queue producer/,
    );
  });
});

describe("patchInstalledCfQueueProducer", () => {
  test("patches the cf bundle that builds dashboard queue producers", () => {
    const root = mkdtempSync(join(tmpdir(), "wub-cf-"));
    const dist = join(root, "node_modules/cf/dist");
    mkdirSync(dist, { recursive: true });
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "wub" }));
    writeFileSync(
      join(root, "node_modules/cf/package.json"),
      JSON.stringify({ name: "cf" }),
    );
    const bundle = join(dist, "dist-test.mjs");
    writeFileSync(
      bundle,
      `case\`queue\`:e.queues.producers=[${QUEUE_PRODUCER_WITH_UNDEFINED_DELAY}]`,
    );
    writeFileSync(join(dist, "other.mjs"), "exports.ok = true\n");

    expect(patchInstalledCfQueueProducer(root)).toEqual([bundle]);
    expect(readFileSync(bundle, "utf8")).toContain(
      QUEUE_PRODUCER_OMIT_UNDEFINED_DELAY,
    );
    expect(readFileSync(join(dist, "other.mjs"), "utf8")).toBe(
      "exports.ok = true\n",
    );

    rmSync(root, { recursive: true, force: true });
  });
});
