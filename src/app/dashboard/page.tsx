import { AppHeader } from "@/components/app-header";
import { LinksView } from "@/components/links-view";
import { getServerAuthSession } from "@/server/auth";
import { api } from "@/trpc/server";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/dashboard");
  }
  const links = await api.link.getUserLinks();
  return (
    <div className="space-y-10">
      <AppHeader pageTitle="Links" />
      <LinksView initialLinks={links} />
    </div>
  );
}
