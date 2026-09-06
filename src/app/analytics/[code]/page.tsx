import { AnalyticDisplay } from "@/components/analytic-display";
import { AppHeader } from "@/components/app-header";
import { ClicksChart } from "@/components/clicks-chart";
import { CopyButton } from "@/components/copy-button";
import { EmptyState } from "@/components/empty-state";
import { QRCodeButton } from "@/components/qr-code-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UrlFavicon } from "@/components/url-favicon";
import { getProjectUrl } from "@/lib/project-url";
import { getServerAuthSession } from "@/server/auth";
import { api } from "@/trpc/server";
import { TRPCError } from "@trpc/server";
import * as countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import { BarChart3 } from "lucide-react";
import { notFound, redirect } from "next/navigation";

countries.registerLocale(enLocale);

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await getServerAuthSession();
  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/analytics/${code}`);
  }

  const clicks = await getAnalytics(code);
  if (!clicks) {
    notFound();
  }

  const shortUrl = `${getProjectUrl()}${code}`;
  const countryClicks = Object.entries(clicks.countClicks.countryClicks)
    .map(([country, count]) => ({ country, clicks: count }))
    .sort((a, b) => b.clicks - a.clicks);
  const cityClicks = Object.entries(clicks.countClicks.cityClicks)
    .map(([city, { clicks: count, country }]) => ({
      city,
      clicks: count,
      country,
    }))
    .sort((a, b) => b.clicks - a.clicks);
  const deviceClicks = Object.entries(clicks.countClicks.deviceClicks)
    .map(([device, count]) => ({ device, clicks: count }))
    .sort((a, b) => b.clicks - a.clicks);
  const browserClicks = Object.entries(clicks.countClicks.browserClicks)
    .map(([browser, count]) => ({ browser, clicks: count }))
    .sort((a, b) => b.clicks - a.clicks);
  const osClicks = Object.entries(clicks.countClicks.osClicks)
    .map(([os, count]) => ({ os, clicks: count }))
    .sort((a, b) => b.clicks - a.clicks);

  return (
    <div className="flex flex-col space-y-8 pb-10">
      <AppHeader pageTitle="Analytics" hideCta />
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4">
        <header className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <UrlFavicon url={clicks.link.url} />
            <div className="min-w-0 space-y-1">
              <a
                href={clicks.link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-base font-semibold break-all text-foreground hover:underline"
              >
                {clicks.link.url}
              </a>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-sm text-primary">{shortUrl}</p>
                <CopyButton text={shortUrl} />
                <QRCodeButton url={shortUrl} />
              </div>
              <p className="text-xs text-muted-foreground">
                Created{" "}
                {new Date(clicks.link.created_at).toLocaleDateString("en-GB")}
              </p>
            </div>
          </div>
          <div className="shrink-0 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Total clicks
            </p>
            <p className="text-3xl font-semibold tabular-nums">
              {clicks.totalClicks}
            </p>
          </div>
        </header>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          {clicks.totalClicks === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No clicks yet"
              description="Share the short link and this chart will fill in as visits arrive."
            />
          ) : (
            <ClicksChart
              chartData={clicks.clickRange}
              totalClicks={clicks.totalClicks}
            />
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
            <Tabs defaultValue="countries">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold">Locations</h2>
                <TabsList>
                  <TabsTrigger value="countries">Countries</TabsTrigger>
                  <TabsTrigger value="cities">Cities</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="countries" className="space-y-2">
                {countryClicks.length > 0 ? (
                  countryClicks.map(({ country, clicks: count }) => (
                    <AnalyticDisplay
                      key={country}
                      name={country}
                      clicks={count}
                      iconUrl={`https://flag.vercel.app/m/${country}.svg`}
                      displayName={
                        countries.getName(country, "en") ?? "Unknown"
                      }
                    />
                  ))
                ) : (
                  <EmptyState
                    title="No country data"
                    description="Location breakdowns appear after the first click."
                  />
                )}
              </TabsContent>
              <TabsContent value="cities" className="space-y-2">
                {cityClicks.length > 0 ? (
                  cityClicks.map(({ city, country, clicks: count }) => (
                    <AnalyticDisplay
                      key={city}
                      name={city}
                      clicks={count}
                      iconUrl={`https://flag.vercel.app/m/${country}.svg`}
                      displayName={city}
                    />
                  ))
                ) : (
                  <EmptyState
                    title="No city data"
                    description="City breakdowns appear after the first click."
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
            <Tabs defaultValue="devices">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold">Clients</h2>
                <TabsList className="flex-wrap">
                  <TabsTrigger value="devices">Devices</TabsTrigger>
                  <TabsTrigger value="browsers">Browsers</TabsTrigger>
                  <TabsTrigger value="os">OS</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="devices" className="space-y-2">
                {deviceClicks.length > 0 ? (
                  deviceClicks.map(({ device, clicks: count }) => (
                    <AnalyticDisplay
                      key={device}
                      name={device}
                      clicks={count}
                      iconUrl={`https://uaparser.dev/images/types/${device.toLowerCase() === "desktop" ? "default" : device}.png`}
                      displayName={device}
                      imageClassName="h-4 w-4"
                    />
                  ))
                ) : (
                  <EmptyState
                    title="No device data"
                    description="Device breakdowns appear after the first click."
                  />
                )}
              </TabsContent>
              <TabsContent value="browsers" className="space-y-2">
                {browserClicks.length > 0 ? (
                  browserClicks.map(({ browser, clicks: count }) => {
                    const targetBrowser = (
                      browser === "Mobile Safari" ? "Safari" : browser
                    ).toLowerCase();
                    return (
                      <AnalyticDisplay
                        key={browser}
                        name={browser}
                        clicks={count}
                        iconUrl={`https://uaparser.dev/images/browsers/${targetBrowser}.png`}
                        displayName={browser}
                        imageClassName="h-4 w-4"
                        infoContainerClassName="leading-4"
                      />
                    );
                  })
                ) : (
                  <EmptyState
                    title="No browser data"
                    description="Browser breakdowns appear after the first click."
                  />
                )}
              </TabsContent>
              <TabsContent value="os" className="space-y-2">
                {osClicks.length > 0 ? (
                  osClicks.map(({ os, clicks: count }) => (
                    <AnalyticDisplay
                      key={os}
                      name={os}
                      clicks={count}
                      iconUrl={`https://uaparser.dev/images/os/${os.toLowerCase().replace(" ", "")}.png`}
                      displayName={os}
                      imageClassName="h-4 w-4"
                      infoContainerClassName="leading-4"
                    />
                  ))
                ) : (
                  <EmptyState
                    title="No OS data"
                    description="Operating system breakdowns appear after the first click."
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>
    </div>
  );
}

async function getAnalytics(code: string) {
  try {
    return await api.link.getClicksFromLast30Days(code);
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      return null;
    }
    throw error;
  }
}
