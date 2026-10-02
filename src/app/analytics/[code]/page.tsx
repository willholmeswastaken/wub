import { BreakdownCard } from "@/components/breakdown-card";
import { ClicksChart } from "@/components/clicks-chart";
import { LinkActions } from "@/components/link-actions";
import { ProductBar } from "@/components/product-bar";
import { RangePicker } from "@/components/range-picker";
import { UrlFavicon } from "@/components/url-favicon";
import { clickRangeLabel, parseClickRange } from "@/lib/click-date-range";
import { countryName, flagEmoji } from "@/lib/format";
import { projectUrlFromHeaders } from "@/lib/project-url";
import { getServerAuthSession } from "@/server/auth";
import { api } from "@/trpc/server";
import { TRPCError } from "@trpc/server";
import {
  Gamepad2,
  Globe,
  HelpCircle,
  Link2,
  Monitor,
  Smartphone,
  Tablet,
  Tv,
  Watch,
} from "lucide-react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { type ReactNode } from "react";

const deviceIcons: Record<string, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  console: Gamepad2,
  smarttv: Tv,
  wearable: Watch,
};

function DeviceIcon({ device }: { device: string }) {
  const Icon = deviceIcons[device.toLowerCase()] ?? HelpCircle;
  return <Icon className="h-4 w-4" />;
}

function deviceLabel(device: string) {
  if (device.toLowerCase() === "smarttv") return "Smart TV";
  return device.charAt(0).toUpperCase() + device.slice(1);
}

function referrerLabel(referrer: string) {
  return referrer === "direct" ? "Direct or unknown" : referrer;
}

function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null;
  icon?: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-background p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 flex min-w-0 items-center gap-2 font-semibold">
        {value ? (
          <>
            {icon && <span className="shrink-0">{icon}</span>}
            <span className="truncate">{value}</span>
          </>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </p>
    </div>
  );
}

async function loadClicks(
  code: string,
  range: ReturnType<typeof parseClickRange>,
) {
  try {
    return await api.link.getClicks({ code, range });
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { code } = await params;
  const range = parseClickRange((await searchParams).range);
  const session = await getServerAuthSession();
  if (!session) {
    redirect(`/signin?callbackUrl=/analytics/${code}`);
  }
  const clicks = await loadClicks(code, range);
  const shortUrl = `${projectUrlFromHeaders(await headers())}${code}`;
  const { breakdown } = clicks;

  const topCountry = breakdown.countries[0];
  const topReferrer = breakdown.referrers[0];
  const topDevice = breakdown.devices[0];

  return (
    <div className="pb-12">
      <ProductBar title="Analytics" backHref="/dashboard" />
      <section className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-8">
        <div className="flex items-start gap-4">
          <UrlFavicon url={clicks.link.url} className="h-10 w-10" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold">
              {shortUrl.replace(/^https?:\/\//, "")}
            </h2>
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
              {new Date(clicks.link.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <LinkActions
          shortUrl={shortUrl}
          shortCode={code}
          url={clicks.link.url}
        />
        <div className="rounded-2xl border border-border bg-background p-5">
          <div className="mb-4 flex justify-end">
            <RangePicker code={code} value={range} />
          </div>
          <ClicksChart
            chartData={clicks.clickRange}
            totalClicks={clicks.totalClicks}
            previousTotalClicks={clicks.previousTotalClicks}
            periodLabel={clickRangeLabel[range]}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile
            label="Top country"
            value={topCountry ? countryName(topCountry.key) : null}
            icon={topCountry ? flagEmoji(topCountry.key) : undefined}
          />
          <StatTile
            label="Top source"
            value={topReferrer ? referrerLabel(topReferrer.key) : null}
            icon={<Link2 className="h-4 w-4 text-muted-foreground" />}
          />
          <StatTile
            label="Top device"
            value={topDevice ? deviceLabel(topDevice.key) : null}
            icon={
              topDevice ? (
                <span className="text-muted-foreground">
                  <DeviceIcon device={topDevice.key} />
                </span>
              ) : undefined
            }
          />
        </div>
        <BreakdownCard
          title="Sources"
          tabs={[
            {
              value: "referrers",
              label: "Referrers",
              items: breakdown.referrers.map(({ key, count }) => ({
                key,
                count,
                label: referrerLabel(key),
                icon: <Globe className="h-4 w-4" />,
              })),
            },
          ]}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <BreakdownCard
            title="Locations"
            tabs={[
              {
                value: "countries",
                label: "Countries",
                items: breakdown.countries.map(({ key, count }) => ({
                  key,
                  count,
                  label: countryName(key),
                  icon: flagEmoji(key),
                })),
              },
              {
                value: "cities",
                label: "Cities",
                items: breakdown.cities.map(({ key, count, country }) => ({
                  key,
                  count,
                  label: key,
                  icon: flagEmoji(country),
                })),
              },
            ]}
          />
          <BreakdownCard
            title="Technology"
            tabs={[
              {
                value: "devices",
                label: "Devices",
                items: breakdown.devices.map(({ key, count }) => ({
                  key,
                  count,
                  label: deviceLabel(key),
                  icon: <DeviceIcon device={key} />,
                })),
              },
              {
                value: "browsers",
                label: "Browsers",
                items: breakdown.browsers.map(({ key, count }) => ({
                  key,
                  count,
                  label: key,
                })),
              },
              {
                value: "os",
                label: "OS",
                items: breakdown.os.map(({ key, count }) => ({
                  key,
                  count,
                  label: key,
                })),
              },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
