import { AnalyticDisplay } from "@/components/analytic-display";
import { ClicksChart } from "@/components/clicks-chart";
import { LinkActions } from "@/components/link-actions";
import { ProductBar } from "@/components/product-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UrlFavicon } from "@/components/url-favicon";
import { projectUrlFromHeaders } from "@/lib/project-url";
import { getServerAuthSession } from "@/server/auth";
import { api } from "@/trpc/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryDisplayName(code: string) {
  if (!/^[a-z]{2}$/i.test(code)) return "Unknown";
  try {
    return regionNames.of(code) ?? "Unknown";
  } catch {
    return "Unknown";
  }
}

function totalOf(items: { count: number }[]) {
  return items.reduce((sum, item) => sum + item.count, 0);
}

function EmptyBreakdown() {
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">
      No clicks yet
    </p>
  );
}

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await getServerAuthSession();
  if (!session) {
    redirect(`/signin?callbackUrl=/analytics/${code}`);
  }
  const clicks = await api.link.getClicksFromLast30Days(code);
  const shortUrl = `${projectUrlFromHeaders(await headers())}${code}`;

  const countryClicks = Object.entries(clicks.countClicks.countryClicks).map(
    ([country, count]) => ({ country, count }),
  );
  const cityClicks = Object.entries(clicks.countClicks.cityClicks).map(
    ([city, { clicks: count, country }]) => ({ city, count, country }),
  );
  const deviceClicks = Object.entries(clicks.countClicks.deviceClicks).map(
    ([device, count]) => ({ device, count }),
  );
  const browserClicks = Object.entries(clicks.countClicks.browserClicks).map(
    ([browser, count]) => ({ browser, count }),
  );
  const osClicks = Object.entries(clicks.countClicks.osClicks).map(
    ([os, count]) => ({ os, count }),
  );

  const countryTotal = totalOf(countryClicks);
  const cityTotal = totalOf(cityClicks);
  const deviceTotal = totalOf(deviceClicks);
  const browserTotal = totalOf(browserClicks);
  const osTotal = totalOf(osClicks);

  return (
    <div className="pb-8">
      <ProductBar title="Analytics" backHref="/dashboard" />
      <section className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-8">
        <div className="flex items-start gap-4">
          <UrlFavicon url={clicks.link.url} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold">{shortUrl}</h2>
            <a
              href={clicks.link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block truncate text-sm text-muted-foreground hover:underline"
            >
              {clicks.link.url}
            </a>
            <p className="mt-1 text-sm text-muted-foreground">
              Created{" "}
              {new Date(clicks.link.created_at).toLocaleDateString("en-GB")}
            </p>
          </div>
        </div>
        <LinkActions shortUrl={shortUrl} shortCode={code} />
        <div className="rounded-2xl border border-border bg-background p-6">
          <ClicksChart
            chartData={clicks.clickRange}
            totalClicks={clicks.totalClicks}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background p-6">
            <Tabs defaultValue="countries">
              <h2 className="text-xl font-semibold">Locations</h2>
              <TabsList className="mt-4 h-auto max-w-full flex-wrap justify-start">
                <TabsTrigger value="countries">Countries</TabsTrigger>
                <TabsTrigger value="cities">Cities</TabsTrigger>
              </TabsList>
              <TabsContent value="countries" className="mt-4">
                {countryClicks.length > 0 ? (
                  <div className="space-y-4">
                    {countryClicks.map(({ country, count }) => (
                      <AnalyticDisplay
                        key={country}
                        name={country}
                        clicks={count}
                        total={countryTotal}
                        iconUrl={`https://flag.vercel.app/m/${country}.svg`}
                        displayName={countryDisplayName(country)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyBreakdown />
                )}
              </TabsContent>
              <TabsContent value="cities" className="mt-4">
                {cityClicks.length > 0 ? (
                  <div className="space-y-4">
                    {cityClicks.map(({ city, country, count }) => (
                      <AnalyticDisplay
                        key={city}
                        name={city}
                        clicks={count}
                        total={cityTotal}
                        iconUrl={`https://flag.vercel.app/m/${country}.svg`}
                        displayName={city}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyBreakdown />
                )}
              </TabsContent>
            </Tabs>
          </div>
          <div className="rounded-2xl border border-border bg-background p-6">
            <Tabs defaultValue="devices">
              <h2 className="text-xl font-semibold">Clients</h2>
              <TabsList className="mt-4 h-auto max-w-full flex-wrap justify-start">
                <TabsTrigger value="devices">Devices</TabsTrigger>
                <TabsTrigger value="browsers">Browsers</TabsTrigger>
                <TabsTrigger value="os">OS</TabsTrigger>
              </TabsList>
              <TabsContent value="devices" className="mt-4">
                {deviceClicks.length > 0 ? (
                  <div className="space-y-4">
                    {deviceClicks.map(({ device, count }) => (
                      <AnalyticDisplay
                        key={device}
                        name={device}
                        clicks={count}
                        total={deviceTotal}
                        iconUrl={`https://uaparser.dev/images/types/${device.toLowerCase() === "desktop" ? "default" : device}.png`}
                        displayName={device}
                        imageClassName="h-4 w-4"
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyBreakdown />
                )}
              </TabsContent>
              <TabsContent value="browsers" className="mt-4">
                {browserClicks.length > 0 ? (
                  <div className="space-y-4">
                    {browserClicks.map(({ browser, count }) => {
                      const targetBrowser = (
                        browser === "Mobile Safari" ? "Safari" : browser
                      ).toLowerCase();
                      return (
                        <AnalyticDisplay
                          key={browser}
                          name={browser}
                          clicks={count}
                          total={browserTotal}
                          iconUrl={`https://uaparser.dev/images/browsers/${targetBrowser}.png`}
                          displayName={browser}
                          imageClassName="h-4 w-4"
                        />
                      );
                    })}
                  </div>
                ) : (
                  <EmptyBreakdown />
                )}
              </TabsContent>
              <TabsContent value="os" className="mt-4">
                {osClicks.length > 0 ? (
                  <div className="space-y-4">
                    {osClicks.map(({ os, count }) => (
                      <AnalyticDisplay
                        key={os}
                        name={os}
                        clicks={count}
                        total={osTotal}
                        iconUrl={`https://uaparser.dev/images/os/${os.toLowerCase().replace(" ", "")}.png`}
                        displayName={os}
                        imageClassName="h-4 w-4"
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyBreakdown />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>
    </div>
  );
}
