"use client";

import { AreaChart } from "@/components/ui/area-chart";
import { type DateObject } from "@/lib/click-date-range";

export const ClicksChart = ({
  chartData,
  totalClicks,
}: {
  chartData: DateObject[];
  totalClicks: number;
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-5xl font-semibold tabular-nums">{totalClicks}</p>
        <p className="text-sm text-muted-foreground">Last 30 days</p>
      </div>
      <AreaChart
        type="default"
        className="h-[220px] w-full"
        data={chartData}
        index="date"
        categories={["clicks"]}
        showLegend={false}
      />
    </div>
  );
};
