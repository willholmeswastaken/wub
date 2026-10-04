import { expect, test } from "bun:test";

import {
  ensureGithubProfileEmail,
  fetchGithubPrimaryEmail,
  GITHUB_USER_AGENT,
  pickGithubEmail,
} from "@/server/github-email";
import { Miniflare } from "miniflare";

test("primary github email is preferred", () => {
  expect(
    pickGithubEmail([
      { email: "other@example.com", primary: false },
      { email: "ada@example.com", primary: true },
    ]),
  ).toBe("ada@example.com");
});

test("private github emails are requested with a user agent", async () => {
  let userAgent: string | null = null;
  let authorization: string | null = null;
  const profile = await ensureGithubProfileEmail(
    { id: 1, email: null, login: "ada" },
    "github-token",
    async (_input, init) => {
      const headers = new Headers(init?.headers);
      userAgent = headers.get("user-agent");
      authorization = headers.get("authorization");
      return Response.json([
        {
          email: "other@example.com",
          primary: false,
          verified: true,
          visibility: "private",
        },
        {
          email: "ada@example.com",
          primary: true,
          verified: true,
          visibility: "private",
        },
      ]);
    },
  );

  expect(userAgent).toBe(GITHUB_USER_AGENT);
  expect(authorization).toBe("token github-token");
  expect(profile.email).toBe("ada@example.com");
});

test("public github emails skip the private email lookup", async () => {
  let called = false;
  const profile = await ensureGithubProfileEmail(
    { email: "ada@example.com" },
    "github-token",
    async () => {
      called = true;
      return Response.json([]);
    },
  );

  expect(called).toBe(false);
  expect(profile.email).toBe("ada@example.com");
});

test("cloudflare workers can call the github emails api with a user agent", async () => {
  const miniflare = new Miniflare({
    workers: [
      {
        config: {
          name: "wub",
          compatibilityDate: "2026-10-01",
          manifest: {
            mainModule: "index.js",
            modules: {
              "index.js": {
                type: "esm",
                contents: `
                  const userAgent = ${JSON.stringify(GITHUB_USER_AGENT)};
                  export default {
                    async fetch(request) {
                      const includeUserAgent = new URL(request.url).searchParams.get("ua") === "1";
                      const headers = {
                        Accept: "application/vnd.github+json",
                        Authorization: "token not-a-token",
                      };
                      if (includeUserAgent) headers["User-Agent"] = userAgent;
                      const response = await fetch("https://api.github.com/user/emails", { headers });
                      return Response.json({ status: response.status });
                    },
                  };
                `,
              },
            },
          },
        },
      },
    ],
  });

  try {
    const worker = await miniflare.getWorker("wub");
    const missing = (await (
      await worker.fetch("https://wub.test/?ua=0")
    ).json()) as { status: number };
    const present = (await (
      await worker.fetch("https://wub.test/?ua=1")
    ).json()) as { status: number };

    expect(missing.status).toBe(403);
    expect(present.status).toBe(401);
  } finally {
    await miniflare.dispose();
  }
});

test("github email lookup reports the api status", async () => {
  let message = "";
  try {
    await fetchGithubPrimaryEmail(
      "token",
      async () => new Response("no", { status: 403 }),
    );
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  expect(message).toBe("GitHub email lookup failed with status 403");
});
