/**
 * GitHub hides private emails from `/user`. The fallback is `/user/emails`,
 * which GitHub rejects unless the request has a User-Agent. Cloudflare Workers
 * fetch does not set one, so that lookup was failing and Auth.js inserted a
 * null email into `wub_user`.
 */
export const GITHUB_USER_AGENT = "wub";

const GITHUB_EMAILS_URL = "https://api.github.com/user/emails";

export type GithubEmailAddress = {
  email?: string | null;
  primary?: boolean;
};

export function pickGithubEmail(
  emails: GithubEmailAddress[],
): string | undefined {
  const withAddress = emails.filter(
    (entry): entry is GithubEmailAddress & { email: string } =>
      typeof entry.email === "string" && entry.email.length > 0,
  );
  return (withAddress.find((entry) => entry.primary) ?? withAddress[0])?.email;
}

export async function fetchGithubPrimaryEmail(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchImpl(GITHUB_EMAILS_URL, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `token ${accessToken}`,
      "User-Agent": GITHUB_USER_AGENT,
    },
  });
  if (!response.ok) {
    throw new Error(
      `GitHub email lookup failed with status ${response.status}`,
    );
  }

  const emails: unknown = await response.json();
  const email = Array.isArray(emails) ? pickGithubEmail(emails) : undefined;
  if (!email) {
    throw new Error("GitHub account has no email address");
  }
  return email;
}

export async function ensureGithubProfileEmail<
  T extends { email?: string | null },
>(
  profile: T,
  accessToken: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<Omit<T, "email"> & { email: string }> {
  if (profile.email) return profile as Omit<T, "email"> & { email: string };
  if (!accessToken) {
    throw new Error("GitHub did not return an access token");
  }
  return {
    ...profile,
    email: await fetchGithubPrimaryEmail(accessToken, fetchImpl),
  };
}
