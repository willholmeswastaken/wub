
import { AppHeader } from "@/components/app-header";
import { ClicksChart } from "@/components/clicks-chart";
import { getServerAuthSession } from "@/server/auth";
import { api } from "@/trpc/server";
import { redirect } from "next/navigation";
import Image from 'next/image';
import * as countries from 'i18n-iso-countries';

export default async function Dashboard({ params }: { params: { code: string } }) {
    const session = await getServerAuthSession();
    if (!session) {
        redirect("/api/auth/signin?callbackUrl=/dashboard")
    }
    const links = await api.link.getClicksFromLast30Days(params.code);
    const countryClicks = Object.entries(links.countryClicks).map(([country, clicks]) => ({ country, clicks }));
    const deviceClicks = Object.entries(links.deviceClicks).map(([device, clicks]) => ({ device, clicks }));
    return (
        <div className="flex flex-col space-y-10 pb-10">
            <AppHeader pageTitle="Analytics" hideCta />
            <section className="h-full flex-1 mx-auto max-w-4xl w-full flex flex-col space-y-3">
                <div className="bg-white border border-gray-200 p-5 sm:border-gray-100 sm:p-10 sm:shadow-lg sm:rounded-lg">
                    <ClicksChart chartData={links.clickRange} totalClicks={links.totalClicks} />
                </div>
                <div className="flex flex-col sm:flex-row w-full space-x-2">
                    <div className="bg-white w-full border border-gray-200 p-5 sm:border-gray-100 sm:p-10 sm:shadow-lg sm:rounded-lg flex flex-col gap-y-2">
                        <h2 className="text-2xl text-gray-600">Locations</h2>
                        <div className="flex flex-col space-y-2">
                            {
                                countryClicks.length > 0
                                ? countryClicks.map(({ country, clicks }) => (
                                    <div key={country} className="flex justify-between items-start">
                                        <div className="flex flex-row items-start leading-3 space-x-2">
                                            {country !== 'unknown' && <Image alt={country} unoptimized src={`https://flag.vercel.app/m/${country}.svg`} className="h-3 w-5" width={20} height={20} />}
                                            <span>{countries.getName(country, 'en') ?? 'Unknown'}</span>
                                        </div>
                                        <span>{clicks}</span>
                                    </div>
                                ))
                                : <p className="text-gray-400">No data available</p>
                            }
                        </div>
                    </div>
                    <div className="bg-white border w-full border-gray-200 p-5 sm:border-gray-100 sm:p-10 sm:shadow-lg sm:rounded-lg flex flex-col gap-y-2">
                        <h2 className="text-2xl text-gray-600">Devices</h2>
                        <div className="flex flex-col space-y-2">
                            {
                                deviceClicks.length > 0
                                ? deviceClicks.map(({ device, clicks }) => (
                                    <div key={device} className="flex justify-between items-start">
                                        <div className="flex flex-row items-start leading-3 space-x-2">
                                            {device !== 'unknown' && <Image alt={device} unoptimized src={`https://uaparser.js.org/images/types/${device.toLowerCase() === 'desktop' ? 'default' : device}.png`} className="h-4 w-4" width={20} height={20} />}
                                            <span className="capitalize">{device}</span>
                                        </div>
                                        <span>{clicks}</span>
                                    </div>
                                ))
                                : <p className="text-gray-400">No data available</p>
                            }
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}