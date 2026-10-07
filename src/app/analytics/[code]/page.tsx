import { BreakdownCard } from "@/components/breakdown-card";
import { ClicksChart } from "@/components/clicks-chart";
import { LinkActions } from "@/components/link-actions";
import { RangePicker } from "@/components/range-picker";
import { ShareBar } from "@/components/share-bar";
import { UrlFavicon } from "@/components/url-favicon";
import { clickRangeLabel, parseClickRange } from "@/lib/click-date-range";
import { countryName, flagEmoji, formatDate, percentOf } from "@/lib/format";
import { projectUrlFromHeaders } from "@/lib/project-url";
import { getServerAuthSession } from "@/server/auth";
import { api } from "@/trpc/server";
import { TRPCError } from "@trpc/server";
import {
  ArrowLeft,
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
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { type ReactNode } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  count,
  total,
  icon,
}: {
  label: string;
  value: string | null;
  count?: number;
  total: number;
  icon?: ReactNode;
}) {
  const share =
    value != null && count != null && total > 0
      ? { count, ratio: (count / total) * 100 }
      : null;

  return (
    <div className="min-w-0 py-6 sm:px-8 sm:first:pl-0 sm:last:pr-0">
      <p className="flex min-w-0 items-center gap-2 text-xl font-medium tracking-[-0.03em] md:text-2xl">
        {value ? (
          <>
            {icon && <span className="shrink-0">{icon}</span>}
            <span className="truncate">{value}</span>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </p>
      {share && (
        <div className="mt-3 flex items-center gap-3">
          <ShareBar share={share.ratio} className="w-16 shrink-0" />
          <p className="min-w-0 truncate text-sm tabular-nums tracking-[-0.02em] text-muted-foreground">
            <span className="font-medium text-foreground">
              {share.count.toLocaleString()}
            </span>
            <span> · {percentOf(share.count, total)}</span>
          </p>
        </div>
      )}
      <p
        className={
          share
            ? "mt-2 text-sm text-muted-foreground"
            : "mt-1 text-sm text-muted-foreground"
        }
      >
        {label}
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

  const displayShort = shortUrl.replace(/^https?:\/\//, "");

  return (
    <div className="pb-20">
      <section className="mx-auto w-full max-w-6xl px-6 py-12 md:px-8 md:py-16">
        <Link
          href="/dashboard"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" />
          Links
        </Link>
        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            <UrlFavicon
              url={clicks.link.url}
              className="h-14 w-14 rounded-2xl"
            />
            <div className="min-w-0">
              <h1 className="truncate text-4xl font-medium tracking-[-0.05em] sm:text-5xl">
                /{code}
              </h1>
              <p className="mt-2 truncate text-sm text-muted-foreground">
                <a
                  href={shortUrl}
                  className="hover:text-foreground hover:underline"
                >
                  {displayShort}
                </a>
                <span> · </span>
                <a
                  href={clicks.link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground hover:underline"
                >
                  {clicks.link.url}
                </a>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Created {formatDate(clicks.link.created_at)}
              </p>
            </div>
          </div>
          <LinkActions
            shortUrl={shortUrl}
            shortCode={code}
            url={clicks.link.url}
          />
        </div>
        <div className="mt-16 border-t border-border/80 pt-10">
          <ClicksChart
            chartData={clicks.clickRange}
            totalClicks={clicks.totalClicks}
            previousTotalClicks={clicks.previousTotalClicks}
            periodLabel={clickRangeLabel[range]}
            aside={<RangePicker code={code} value={range} />}
          />
        </div>
        <div className="mt-10 grid grid-cols-1 divide-y divide-border/80 border-y border-border/80 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <StatTile
            label="Top country"
            value={topCountry ? countryName(topCountry.key) : null}
            count={topCountry?.count}
            total={clicks.totalClicks}
            icon={topCountry ? flagEmoji(topCountry.key) : undefined}
          />
          <StatTile
            label="Top source"
            value={topReferrer ? referrerLabel(topReferrer.key) : null}
            count={topReferrer?.count}
            total={clicks.totalClicks}
            icon={<Link2 className="h-4 w-4 text-muted-foreground" />}
          />
          <StatTile
            label="Top device"
            value={topDevice ? deviceLabel(topDevice.key) : null}
            count={topDevice?.count}
            total={clicks.totalClicks}
            icon={
              topDevice ? (
                <span className="text-muted-foreground">
                  <DeviceIcon device={topDevice.key} />
                </span>
              ) : undefined
            }
          />
        </div>
        <div className="mt-16 grid grid-cols-1 gap-x-16 gap-y-14 lg:grid-cols-3">
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
