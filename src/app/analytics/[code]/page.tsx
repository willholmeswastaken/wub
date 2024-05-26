
import { AppHeader } from "@/components/app-header";
import { ClicksChart } from "@/components/clicks-chart";
import { getServerAuthSession } from "@/server/auth";
import { api } from "@/trpc/server";
import { redirect } from "next/navigation";

export default async function Dashboard({ params }: { params: { code: string } }) {
    const session = await getServerAuthSession();
    if (!session) {
        redirect("/api/auth/signin?callbackUrl=/dashboard")
    }
    const links = await api.link.getClicksFromLast30Days(params.code);
    return (
        <div className="flex flex-col space-y-10 pb-10">
            <AppHeader pageTitle="Analytics" />
            <section className="h-full flex-1 mx-auto max-w-4xl w-full flex flex-col space-y-3">
                <div className="bg-white border border-gray-200 p-5 sm:border-gray-100 sm:p-10 sm:shadow-lg sm:rounded-lg">
                    <ClicksChart chartData={links} />
                </div>
            </section>
        </div>
    )
}