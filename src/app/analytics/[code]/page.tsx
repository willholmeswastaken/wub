import { AppHeader } from "@/components/app-header";
import { ClicksChart } from "@/components/clicks-chart";
import { getServerAuthSession } from "@/server/auth";
import { api } from "@/trpc/server";
import { redirect } from "next/navigation";
import * as countries from "i18n-iso-countries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticDisplay } from "@/components/analytic-display";

export default async function Dashboard({
  params,
}: {
  params: { code: string };
}) {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/dashboard");
  }
  const clicks = await api.link.getClicksFromLast30Days(params.code);

  const countryClicks = Object.entries(clicks.countClicks.countryClicks).map(
    ([country, clicks]) => ({ country, clicks }),
  );
  const cityClicks = Object.entries(clicks.countClicks.cityClicks).map(
    ([city, { clicks, country }]) => ({ city, clicks, country }),
  );
  const deviceClicks = Object.entries(clicks.countClicks.deviceClicks).map(
    ([device, clicks]) => ({ device, clicks }),
  );
  const browserClicks = Object.entries(clicks.countClicks.browserClicks).map(
    ([browser, clicks]) => ({ browser, clicks }),
  );
  const osClicks = Object.entries(clicks.countClicks.osClicks).map(
    ([os, clicks]) => ({ os, clicks }),
  );

  return (
    <div className="flex flex-col space-y-10 pb-10">
      <AppHeader pageTitle="Analytics" hideCta />
      <section className="mx-auto flex h-full w-full max-w-4xl flex-1 flex-col space-y-3">
        <div className="border border-gray-200 bg-white p-5 sm:rounded-lg sm:border-gray-100 sm:p-10 sm:shadow-lg">
          <ClicksChart
            chartData={clicks.clickRange}
            totalClicks={clicks.totalClicks}
          />
        </div>
        <div className="flex w-full flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
          <div className="flex w-full flex-col gap-y-2 border border-gray-200 bg-white p-5 sm:rounded-lg sm:border-gray-100 sm:p-10 sm:shadow-lg">
            <Tabs defaultValue="countries">
              <div className="flex flex-row justify-between pb-2">
                <h2 className="text-2xl text-gray-600">Locations</h2>
                <TabsList>
                  <TabsTrigger value="countries">Countries</TabsTrigger>
                  <TabsTrigger value="cities">Cities</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent
                value="countries"
                className="space-y-2 transition-all duration-200 ease-in-out"
              >
                {countryClicks.length > 0 ? (
                  countryClicks.map(({ country, clicks }) => (
                    <AnalyticDisplay
                      key={country}
                      name={country}
                      clicks={clicks}
                      iconUrl={`https://flag.vercel.app/m/${country}.svg`}
                      displayName={
                        countries.getName(country, "en") ?? "Unknown"
                      }
                    />
                  ))
                ) : (
                  <p className="text-gray-400">No data available</p>
                )}
              </TabsContent>
              <TabsContent
                value="cities"
                className="space-y-2 transition-all duration-200 ease-in-out"
              >
                {cityClicks.length > 0 ? (
                  cityClicks.map(({ city, country, clicks }) => (
                    <AnalyticDisplay
                      key={city}
                      name={city}
                      clicks={clicks}
                      iconUrl={`https://flag.vercel.app/m/${country}.svg`}
                      displayName={city}
                    />
                  ))
                ) : (
                  <p className="text-gray-400">No data available</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
          <div className="flex w-full flex-col gap-y-2 border border-gray-200 bg-white p-5 sm:rounded-lg sm:border-gray-100 sm:p-10 sm:shadow-lg">
            <Tabs defaultValue="devices">
              <div className="flex flex-row justify-between pb-2">
                <h2 className="text-2xl text-gray-600">Clients</h2>
                <TabsList>
                  <TabsTrigger value="devices">Devices</TabsTrigger>
                  <TabsTrigger value="browsers">Browsers</TabsTrigger>
                  <TabsTrigger value="os">OS</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent
                value="devices"
                className="space-y-2 transition-all duration-200 ease-in-out"
              >
                {deviceClicks.length > 0 ? (
                  deviceClicks.map(({ device, clicks }) => (
                    <AnalyticDisplay
                      key={device}
                      name={device}
                      clicks={clicks}
                      iconUrl={`https://uaparser.dev/images/types/${device.toLowerCase() === "desktop" ? "default" : device}.png`}
                      displayName={device}
                      imageClassName="h-4 w-4"
                    />
                  ))
                ) : (
                  <p className="text-gray-400">No data available</p>
                )}
              </TabsContent>
              <TabsContent
                value="browsers"
                className="space-y-2 transition-all duration-200 ease-in-out"
              >
                {browserClicks.length > 0 ? (
                  browserClicks.map(({ browser, clicks }) => {
                    const targetBrowser = (
                      browser === "Mobile Safari" ? "Safari" : browser
                    ).toLowerCase();
                    return (
                      <AnalyticDisplay
                        key={browser}
                        name={browser}
                        clicks={clicks}
                        iconUrl={`https://uaparser.dev/images/browsers/${targetBrowser}.png`}
                        displayName={browser}
                        imageClassName="h-4 w-4"
                        infoContainerClassName="leading-4"
                      />
                    );
                  })
                ) : (
                  <p className="text-gray-400">No data available</p>
                )}
              </TabsContent>
              <TabsContent
                value="os"
                className="space-y-2 transition-all duration-200 ease-in-out"
              >
                {osClicks.length > 0 ? (
                  osClicks.map(({ os, clicks }) => (
                    <AnalyticDisplay
                      key={os}
                      name={os}
                      clicks={clicks}
                      iconUrl={`https://uaparser.dev/images/os/${os.toLowerCase().replace(" ", "")}.png`}
                      displayName={os}
                      imageClassName="h-4 w-4"
                      infoContainerClassName="leading-4"
                    />
                  ))
                ) : (
                  <p className="text-gray-400">No data available</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>
    </div>
  );
}
