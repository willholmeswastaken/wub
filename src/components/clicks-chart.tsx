"use client";

import { AreaChart } from "@/components/ui/area-chart";
import { type DateObject } from "@/lib/click-date-range";
import { BarChartIcon } from "lucide-react";
import React from "react";

export const ClicksChart = ({
  chartData,
  totalClicks,
}: {
  chartData: DateObject[];
  totalClicks: number;
}) => {
  const types: Array<"default" | "stacked" | "percent"> = ["default"];

  return (
    <div className="flex flex-col gap-16">
      {types.map((type, index) => (
        <div key={type} className="flex flex-col gap-4">
          <div className="flex w-full flex-col pl-8">
            <h3 className="flex items-center gap-2 text-4xl font-bold">
              {totalClicks}{" "}
              <BarChartIcon width={24} height={24} className="text-gray-700" />
            </h3>
            <p className="text-lg font-normal text-gray-700">Clicks</p>
          </div>
          <AreaChart
            key={index}
            type={type}
            className="h-96 w-full"
            data={chartData}
            index="date"
            categories={["clicks"]}
            showLegend={false}
            xAxisLabel="Last 30 Days"
          />
        </div>
      ))}
    </div>
  );
};
