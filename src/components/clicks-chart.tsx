"use client";

import { AreaChart } from "@/components/ui/area-chart";
import { type DateObject } from "@/lib/click-date-range";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/stores/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

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
}: {
  chartData: DateObject[];
  totalClicks: number;
  previousTotalClicks: number;
  periodLabel: string;
}) => {
  const hydrated = useHydrated();
  const change = changeLabel(totalClicks, previousTotalClicks);
  const isUp = totalClicks >= previousTotalClicks;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex flex-wrap items-baseline gap-3">
          <p className="text-6xl font-medium tabular-nums tracking-[-0.05em]">
            {totalClicks.toLocaleString()}
          </p>
          {change && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-sm font-medium",
                isUp
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {change !== "New" &&
                (isUp ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                ))}
              {change}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Clicks · {periodLabel.toLowerCase()}
          {change && change !== "New" && (
            <> · {previousTotalClicks.toLocaleString()} in the period before</>
          )}
        </p>
      </div>
      {hydrated ? (
        <AreaChart
          type="default"
          className="h-[220px] w-full"
          data={chartData}
          index="date"
          categories={["clicks"]}
          showLegend={false}
          allowDecimals={false}
        />
      ) : (
        <div className="h-[220px] w-full animate-pulse rounded-xl bg-muted/60" />
      )}
    </div>
  );
};
