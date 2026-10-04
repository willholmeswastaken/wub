import { SignInPanel } from "@/components/sign-in-panel";
import { getServerAuthSession } from "@/server/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Sign in - Wub",
};

function safeCallbackUrl(callbackUrl: string | undefined) {
  if (!callbackUrl) return "/dashboard";
  if (callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
    return callbackUrl;
  }
  try {
    const url = new URL(callbackUrl);
    return `${url.pathname}${url.search}` || "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  const target = safeCallbackUrl(callbackUrl);
  const session = await getServerAuthSession();
  if (session) {
    redirect(target);
  }
  return <SignInPanel callbackUrl={target} error={error} />;
}
