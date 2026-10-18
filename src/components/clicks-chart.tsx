"use client";

import { type DateObject } from "@/lib/click-date-range";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useState, type ReactNode } from "react";

function changeLabel(current: number, previous: number) {
  if (previous === 0) return current > 0 ? "New" : null;
  const change = Math.round(((current - previous) / previous) * 100);
  return `${change > 0 ? "+" : ""}${change}%`;
}

const VIEW_W = 640;
const VIEW_H = 220;
const PAD_X = 28;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

function chartGeometry(data: DateObject[]) {
  const max = Math.max(...data.map((point) => point.clicks), 1);
  const innerW = VIEW_W - PAD_X * 2;
  const innerH = VIEW_H - PAD_TOP - PAD_BOTTOM;
  const points = data.map((point, index) => {
    const x =
      PAD_X +
      (data.length <= 1 ? innerW / 2 : (index / (data.length - 1)) * innerW);
    const y = PAD_TOP + innerH - (point.clicks / max) * innerH;
    return { x, y, point };
  });
  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");
  const last = points[points.length - 1];
  const first = points[0];
  const area =
    points.length === 0 || !first || !last
      ? ""
      : `${line} L${last.x},${PAD_TOP + innerH} L${first.x},${PAD_TOP + innerH} Z`;
  const labelIndexes = labelSlots(data.length);
  return { max, points, line, area, labelIndexes };
}

function labelSlots(length: number) {
  if (length <= 1) return [0];
  if (length <= 8) return Array.from({ length }, (_, index) => index);
  const slots = 5;
  return Array.from({ length: slots }, (_, index) =>
    Math.round((index / (slots - 1)) * (length - 1)),
  );
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
  const hydratedChange = changeLabel(totalClicks, previousTotalClicks);
  const isUp = totalClicks >= previousTotalClicks;
  const geometry = chartGeometry(chartData);
  const [active, setActive] = useState<number | null>(null);
  const activePoint = active == null ? null : (geometry.points[active] ?? null);

  return (
    <div>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-baseline gap-4">
            <p className="text-7xl font-medium tabular-nums tracking-[-0.06em] md:text-8xl">
              {totalClicks.toLocaleString()}
            </p>
            {hydratedChange && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-sm font-medium",
                  isUp
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-destructive",
                )}
              >
                {hydratedChange !== "New" &&
                  (isUp ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  ))}
                {hydratedChange}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Clicks · {periodLabel.toLowerCase()}
            {hydratedChange && hydratedChange !== "New" && (
              <>
                {" "}
                · {previousTotalClicks.toLocaleString()} in the period before
              </>
            )}
          </p>
        </div>
        {aside}
      </div>
      <div className="relative mt-8 h-64 w-full md:h-80">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-full w-full text-brand"
          aria-label={`${totalClicks.toLocaleString()} clicks, ${periodLabel.toLowerCase()}`}
          onPointerLeave={() => setActive(null)}
          onPointerMove={(event) => {
            if (geometry.points.length === 0) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const ratio = (event.clientX - rect.left) / rect.width;
            const index = Math.round(
              Math.min(1, Math.max(0, ratio)) * (geometry.points.length - 1),
            );
            setActive(index);
          }}
        >
          <line
            x1={PAD_X}
            x2={VIEW_W - PAD_X}
            y1={VIEW_H - PAD_BOTTOM}
            y2={VIEW_H - PAD_BOTTOM}
            className="stroke-border"
            strokeWidth="1"
          />
          <text
            x="4"
            y={PAD_TOP + 4}
            className="fill-muted-foreground text-[11px]"
          >
            {geometry.max.toLocaleString()}
          </text>
          <text
            x="4"
            y={VIEW_H - PAD_BOTTOM}
            className="fill-muted-foreground text-[11px]"
          >
            0
          </text>
          {geometry.area && (
            <path d={geometry.area} className="fill-brand" fillOpacity="0.16" />
          )}
          {geometry.line && (
            <path
              d={geometry.line}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {activePoint && (
            <>
              <line
                x1={activePoint.x}
                x2={activePoint.x}
                y1={PAD_TOP}
                y2={VIEW_H - PAD_BOTTOM}
                className="stroke-border"
                strokeWidth="1"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="4"
                fill="currentColor"
              />
            </>
          )}
          {geometry.labelIndexes.map((index) => {
            const point = geometry.points[index];
            if (!point) return null;
            return (
              <text
                key={point.point.date}
                x={point.x}
                y={VIEW_H - 8}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {point.point.date}
              </text>
            );
          })}
        </svg>
        {activePoint && (
          <div
            className="pointer-events-none absolute top-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs shadow-sm"
            style={{
              left: `clamp(0px, ${(activePoint.x / VIEW_W) * 100}%, calc(100% - 8rem))`,
            }}
          >
            <p className="text-muted-foreground">{activePoint.point.date}</p>
            <p className="font-medium tabular-nums">
              {activePoint.point.clicks.toLocaleString()} clicks
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
