/**
 * GitHub hides private emails from `/user`. The fallback is `/user/emails`,
 * which GitHub rejects unless the request has a User-Agent. Cloudflare Workers
 * fetch does not set one, so that lookup was failing and Auth.js inserted a
 * null email into `wub_user`.
 */
import { Context, Data, Effect, Layer } from "effect";

export const GITHUB_USER_AGENT = "wub";

const GITHUB_EMAILS_URL = "https://api.github.com/user/emails";

export type GithubEmailAddress = {
  email?: string | null;
  primary?: boolean;
};

export class GithubEmailError extends Data.TaggedError("GithubEmailError")<{
  readonly reason: "http" | "missing" | "no_token";
  readonly cause: unknown;
}> {}

export class GithubEmails extends Context.Service<
  GithubEmails,
  {
    readonly fetchPrimary: (
      accessToken: string | undefined,
    ) => Effect.Effect<string, GithubEmailError>;
  }
>()("GithubEmails") {}

export function pickGithubEmail(
  emails: GithubEmailAddress[],
): string | undefined {
  const withAddress = emails.filter(
    (entry): entry is GithubEmailAddress & { email: string } =>
      typeof entry.email === "string" && entry.email.length > 0,
  );
  return (withAddress.find((entry) => entry.primary) ?? withAddress[0])?.email;
}

export function GithubEmailsLive(fetchImpl: typeof fetch = fetch) {
  return Layer.succeed(GithubEmails, {
    fetchPrimary: (accessToken) =>
      Effect.gen(function* () {
        if (!accessToken) {
          return yield* new GithubEmailError({
            reason: "no_token",
            cause: new Error("GitHub did not return an access token"),
          });
        }

        const response = yield* Effect.tryPromise({
          try: () =>
            fetchImpl(GITHUB_EMAILS_URL, {
              headers: {
                Accept: "application/vnd.github+json",
                Authorization: `token ${accessToken}`,
                "User-Agent": GITHUB_USER_AGENT,
              },
            }),
          catch: (cause) => new GithubEmailError({ reason: "http", cause }),
        });
        if (!response.ok) {
          return yield* new GithubEmailError({
            reason: "http",
            cause: new Error(
              `GitHub email lookup failed with status ${response.status}`,
            ),
          });
        }

        const emails: unknown = yield* Effect.tryPromise({
          try: () => response.json(),
          catch: (cause) => new GithubEmailError({ reason: "http", cause }),
        });
        const email = Array.isArray(emails)
          ? pickGithubEmail(emails)
          : undefined;
        if (!email) {
          return yield* new GithubEmailError({
            reason: "missing",
            cause: new Error("GitHub account has no email address"),
          });
        }
        return email;
      }),
  });
}

function runGithubEmails<A>(
  effect: Effect.Effect<A, GithubEmailError, GithubEmails>,
  fetchImpl: typeof fetch,
) {
  return Effect.runPromise(
    effect.pipe(
      Effect.provide(GithubEmailsLive(fetchImpl)),
      Effect.catchTag("GithubEmailError", (error) => Effect.die(error.cause)),
    ),
  );
}

export function fetchGithubPrimaryEmail(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  return runGithubEmails(
    GithubEmails.use((github) => github.fetchPrimary(accessToken)),
    fetchImpl,
  );
}

export async function ensureGithubProfileEmail<
  T extends { email?: string | null },
>(
  profile: T,
  accessToken: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<Omit<T, "email"> & { email: string }> {
  if (profile.email) return profile as Omit<T, "email"> & { email: string };
  return {
    ...profile,
    email: await runGithubEmails(
      GithubEmails.use((github) => github.fetchPrimary(accessToken)),
      fetchImpl,
    ),
  };
}
