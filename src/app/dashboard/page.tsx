import { LinksView } from "@/components/links-view";
import { getServerAuthSession } from "@/server/auth";
import { api } from "@/trpc/server";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/signin?callbackUrl=/dashboard");
  }
  const links = await api.link.getUserLinks();
  return <LinksView initialLinks={links} />;
}
