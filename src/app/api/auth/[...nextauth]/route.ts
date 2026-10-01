import { authOptions } from "@/server/auth";
import NextAuthImport from "next-auth";

type NextAuthFn = typeof NextAuthImport;
const nextAuthModule = NextAuthImport as NextAuthFn | { default: NextAuthFn };
const NextAuth =
  typeof nextAuthModule === "function"
    ? nextAuthModule
    : nextAuthModule.default;

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
