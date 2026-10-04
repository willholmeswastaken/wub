"use client";

import { AreaChart } from "@/components/ui/area-chart";
import { type DateObject } from "@/lib/click-date-range";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/stores/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { type ReactNode } from "react";

function changeLabel(current: number, previous: number) {
  if (previous === 0) return current > 0 ? "New" : null;
  const change = Math.round(((current - previous) / previous) * 100);
  return `${change > 0 ? "+" : ""}${change}%`;
}

export const ClicksChart = ({
  chartData,
  totalClicks,
  previousTotalClicks,
  periodLabel,
  aside,
}: {
  chartData: DateObject[];
  totalClicks: number;
  previousTotalClicks: number;
  periodLabel: string;
  aside?: ReactNode;
}) => {
  const hydrated = useHydrated();
  const change = changeLabel(totalClicks, previousTotalClicks);
  const isUp = totalClicks >= previousTotalClicks;

  return (
    <div>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-baseline gap-4">
            <p className="text-7xl font-medium tabular-nums tracking-[-0.06em] md:text-8xl">
              {totalClicks.toLocaleString()}
            </p>
            {change && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-sm font-medium",
                  isUp
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-destructive",
                )}
              >
                {change !== "New" &&
                  (isUp ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  ))}
                {change}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Clicks · {periodLabel.toLowerCase()}
            {change && change !== "New" && (
              <>
                {" "}
                · {previousTotalClicks.toLocaleString()} in the period before
              </>
            )}
          </p>
        </div>
        {aside}
      </div>
      {hydrated ? (
        <AreaChart
          type="default"
          className="mt-8 h-64 w-full md:h-80"
          data={chartData}
          index="date"
          categories={["clicks"]}
          showLegend={false}
          allowDecimals={false}
        />
      ) : (
        <div className="mt-8 h-64 w-full animate-pulse rounded-xl bg-muted/40 md:h-80" />
      )}
    </div>
  );
};
