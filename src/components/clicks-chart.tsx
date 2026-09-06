"use client";

import { AreaChart } from "@/components/ui/area-chart";
import { type DateObject } from "@/lib/click-date-range";
import { BarChartIcon } from "lucide-react";

export const ClicksChart = ({
  chartData,
  totalClicks,
}: {
  chartData: DateObject[];
  totalClicks: number;
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-full flex-col">
        <h3 className="flex items-center gap-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {totalClicks}
          <BarChartIcon className="size-6 text-primary" aria-hidden />
        </h3>
        <p className="text-sm text-muted-foreground">
          Clicks over the last 30 days
        </p>
      </div>
      <AreaChart
        type="default"
        className="h-72 w-full sm:h-96"
        data={chartData}
        index="date"
        categories={["clicks"]}
        showLegend={false}
        xAxisLabel="Last 30 Days"
      />
    </div>
  );
};
