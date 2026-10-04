import { env } from "@/env";
import { sessionWithUserId } from "@/server/auth-session";
import { getAuthAdapter } from "@/server/db";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import GithubProviderImport from "next-auth/providers/github";

type GithubProviderFn = typeof GithubProviderImport;
const githubProviderModule = GithubProviderImport as
  | GithubProviderFn
  | { default: GithubProviderFn };
const GithubProvider =
  typeof githubProviderModule === "function"
    ? githubProviderModule
    : githubProviderModule.default;

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export async function getAuthOptions(): Promise<NextAuthOptions> {
  return {
    callbacks: {
      session: sessionWithUserId,
    },
    adapter: await getAuthAdapter(),
    providers: [
      GithubProvider({
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      }),
      /**
       * ...add more providers here.
       *
       * Most other providers require a bit more work than the Discord provider. For example, the
       * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
       * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
       *
       * @see https://next-auth.js.org/providers/github
       */
    ],
  };
}

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = async () =>
  getServerSession(await getAuthOptions());
