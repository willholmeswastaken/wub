
import { AppHeader } from "@/components/app-header";
import { ClicksChart } from "@/components/clicks-chart";
import { getServerAuthSession } from "@/server/auth";
import { api } from "@/trpc/server";
import { redirect } from "next/navigation";
import Image from 'next/image';
import * as countries from 'i18n-iso-countries';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function Dashboard({ params }: { params: { code: string } }) {
    const session = await getServerAuthSession();
    if (!session) {
        redirect("/api/auth/signin?callbackUrl=/dashboard")
    }
    const clicks = await api.link.getClicksFromLast30Days(params.code);

    const countryClicks = Object.entries(clicks.countClicks.countryClicks).map(([country, clicks]) => ({ country, clicks }));
    const cityClicks = Object.entries(clicks.countClicks.cityClicks).map(([city, { clicks, country }]) => ({ city, clicks, country }));
    const deviceClicks = Object.entries(clicks.countClicks.deviceClicks).map(([device, clicks]) => ({ device, clicks }));
    const browserClicks = Object.entries(clicks.countClicks.browserClicks).map(([browser, clicks]) => ({ browser, clicks }));
    const osClicks = Object.entries(clicks.countClicks.osClicks).map(([os, clicks]) => ({ os, clicks }));

    return (
        <div className="flex flex-col space-y-10 pb-10">
            <AppHeader pageTitle="Analytics" hideCta />
            <section className="h-full flex-1 mx-auto max-w-4xl w-full flex flex-col space-y-3">
                <div className="bg-white border border-gray-200 p-5 sm:border-gray-100 sm:p-10 sm:shadow-lg sm:rounded-lg">
                    <ClicksChart chartData={clicks.clickRange} totalClicks={clicks.totalClicks} />
                </div>
                <div className="flex flex-col sm:flex-row w-full space-x-2">
                    <div className="bg-white w-full border border-gray-200 p-5 sm:border-gray-100 sm:p-10 sm:shadow-lg sm:rounded-lg flex flex-col gap-y-2">
                        <Tabs defaultValue="countries">
                            <div className="flex flex-row justify-between pb-2">
                                <h2 className="text-2xl text-gray-600">Locations</h2>
                                <TabsList>
                                    <TabsTrigger value="countries">Countries</TabsTrigger>
                                    <TabsTrigger value="cities">Cities</TabsTrigger>
                                </TabsList>
                            </div>
                            <TabsContent value="countries" className="ease-in-out transition-all duration-200">
                                {
                                    countryClicks.length > 0
                                        ? countryClicks.map(({ country, clicks }) => (
                                            <div key={country} className="flex justify-between items-start">
                                                <div className="flex flex-row items-start leading-3 space-x-2">
                                                    {<Image alt={country} unoptimized src={`https://flag.vercel.app/m/${country}.svg`} className="h-3 w-5" width={20} height={20} />}
                                                    <span>{countries.getName(country, 'en') ?? 'Unknown'}</span>
                                                </div>
                                                <span>{clicks}</span>
                                            </div>
                                        ))
                                        : <p className="text-gray-400">No data available</p>
                                }
                            </TabsContent>
                            <TabsContent value="cities" className="ease-in-out transition-all duration-200">
                                {
                                    cityClicks.length > 0
                                        ? cityClicks.map(({ city, country, clicks }) => (
                                            <div key={city} className="flex justify-between items-start">
                                                <div className="flex flex-row items-start leading-3 space-x-2">
                                                    {<Image alt={country} unoptimized src={`https://flag.vercel.app/m/${country}.svg`} className="h-3 w-5" width={20} height={20} />}
                                                    <span>{city}</span>
                                                </div>
                                                <span>{clicks}</span>
                                            </div>
                                        ))
                                        : <p className="text-gray-400">No data available</p>
                                }
                            </TabsContent>
                        </Tabs>
                    </div>
                    <div className="bg-white border w-full border-gray-200 p-5 sm:border-gray-100 sm:p-10 sm:shadow-lg sm:rounded-lg flex flex-col gap-y-2">
                        <Tabs defaultValue="devices">
                            <div className="flex flex-row justify-between pb-2">
                                <h2 className="text-2xl text-gray-600">Hardware</h2>
                                <TabsList>
                                    <TabsTrigger value="devices">Devices</TabsTrigger>
                                    <TabsTrigger value="browsers">Browsers</TabsTrigger>
                                    <TabsTrigger value="os">OS</TabsTrigger>
                                </TabsList>
                            </div>
                            <TabsContent value="devices" className="ease-in-out transition-all duration-200">
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
                            </TabsContent>
                            <TabsContent value="browsers" className="ease-in-out transition-all duration-200">
                                {
                                    browserClicks.length > 0
                                        ? browserClicks.map(({ browser, clicks }) => (
                                            <div key={browser} className="flex justify-between items-start">
                                                <div className="flex flex-row items-start leading-4 space-x-2">
                                                    <Image alt={browser} unoptimized src={`https://cdnjs.cloudflare.com/ajax/libs/browser-logos/74.1.0/${browser.toLowerCase()}/${browser.toLowerCase()}.png`} className="h-4 w-4" width={20} height={20} />
                                                    <span className="capitalize">{browser}</span>
                                                </div>
                                                <span>{clicks}</span>
                                            </div>
                                        ))
                                        : <p className="text-gray-400">No data available</p>
                                }
                            </TabsContent>
                            <TabsContent value="os" className="ease-in-out transition-all duration-200">
                                {
                                    osClicks.length > 0
                                        ? osClicks.map(({ os, clicks }) => (
                                            <div key={os} className="flex justify-between items-start">
                                                <div className="flex flex-row items-start space-x-2 justify-start leading-4">
                                                    <Image alt={os} unoptimized src={`https://app.dub.co/_static/icons/${os.toLowerCase().replace(" ", "")}.png`} className="h-4 w-4" width={20} height={20} />
                                                    <span className="capitalize">{os}</span>
                                                </div>
                                                <span>{clicks}</span>
                                            </div>
                                        ))
                                        : <p className="text-gray-400">No data available</p>
                                }
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </section>
        </div>
    )
}