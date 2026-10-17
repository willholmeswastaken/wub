import { AlertsFeed } from "@/components/alerts-feed";
import { getServerAuthSession } from "@/server/auth";
import { api } from "@/trpc/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const session = await getServerAuthSession();
  if (!session) redirect("/signin?callbackUrl=/alerts");
  const alerts = await api.alert.list();
  return <AlertsFeed initialAlerts={alerts} />;
}
