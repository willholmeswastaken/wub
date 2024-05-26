"use client"

import React from "react"

import { AreaChart } from "@/components/ui/area-chart"
import { type DateObject } from "@/lib/click-date-range"

export const ClicksChart = ({ chartData }: { chartData: DateObject[] }) => {
    const types: Array<"default" | "stacked" | "percent"> = [
        "default",
    ]

    return (
        <div className="flex flex-col gap-16">
            {types.map((type, index) => (
                <div key={type} className="flex flex-col gap-4">
                    <p className="mx-auto font-mono text-sm font-medium">type=&quot;{type}&quot;</p>
                    <AreaChart
                        key={index}
                        type={type}
                        className="h-96 w-full"
                        data={chartData}
                        index="date"
                        categories={["clicks"]}
                        showLegend={false}
                    />
                </div>
            ))}
        </div>
    )
}