import { getAuthOptions } from "@/server/auth";
import NextAuthImport from "next-auth";

type NextAuthFn = typeof NextAuthImport;
const nextAuthModule = NextAuthImport as NextAuthFn | { default: NextAuthFn };
const NextAuth =
  typeof nextAuthModule === "function"
    ? nextAuthModule
    : nextAuthModule.default;

async function handler(
  request: Request,
  context: { params: Promise<{ nextauth: string[] }> },
) {
  return NextAuth(await getAuthOptions())(request, context);
}

export { handler as GET, handler as POST };
