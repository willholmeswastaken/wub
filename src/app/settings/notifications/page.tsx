import { NotificationSettings } from "@/components/notification-settings";
import { getServerAuthSession } from "@/server/auth";
import { api } from "@/trpc/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getServerAuthSession();
  if (!session) redirect("/signin?callbackUrl=/settings/notifications");
  const [rules, delivery, links] = await Promise.all([
    api.alert.rules(),
    api.alert.delivery(),
    api.link.getUserLinks(),
  ]);
  return (
    <NotificationSettings
      initialRules={rules}
      initialDelivery={delivery}
      links={links.map((link) => ({
        shortCode: link.short_code,
        url: link.url,
      }))}
    />
  );
}
