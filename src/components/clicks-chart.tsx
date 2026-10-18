"use client";

import { type DateObject } from "@/lib/click-date-range";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";

function changeLabel(current: number, previous: number) {
  if (previous === 0) return current > 0 ? "New" : null;
  const change = Math.round(((current - previous) / previous) * 100);
  return `${change > 0 ? "+" : ""}${change}%`;
}

function formatCount(value: number) {
  // Fixed locale so the server render matches the client. The default
  // locale can differ between the Worker and the browser.
  return value.toLocaleString("en-US");
}

export const CHART_VIEW_W = 640;
export const CHART_VIEW_H = 220;
export const CHART_PAD_X = 28;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

export function chartIndexForViewX(viewX: number, length: number) {
  if (length <= 1) return 0;
  const innerW = CHART_VIEW_W - CHART_PAD_X * 2;
  const t = (viewX - CHART_PAD_X) / innerW;
  const clamped = Math.min(1, Math.max(0, t));
  return Math.round(clamped * (length - 1));
}

function chartGeometry(data: DateObject[]) {
  const max = Math.max(...data.map((point) => point.clicks), 1);
  const innerW = CHART_VIEW_W - CHART_PAD_X * 2;
  const innerH = CHART_VIEW_H - PAD_TOP - PAD_BOTTOM;
  const points = data.map((point, index) => {
    const x =
      CHART_PAD_X +
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

function viewBoxX(svg: SVGSVGElement, clientX: number, clientY: number) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  return point.matrixTransform(matrix.inverse()).x;
}

function tooltipLeft(svg: SVGSVGElement, frame: HTMLElement, viewX: number) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return 0;
  const point = svg.createSVGPoint();
  point.x = viewX;
  point.y = 0;
  const screen = point.matrixTransform(matrix);
  const rect = frame.getBoundingClientRect();
  const raw = screen.x - rect.left;
  return Math.min(Math.max(0, raw), Math.max(0, rect.width - 128));
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
  const frameRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<{ index: number; left: number } | null>(
    null,
  );
  const activePoint =
    active != null && active.index < geometry.points.length
      ? (geometry.points[active.index] ?? null)
      : null;

  function selectFromPointer(event: PointerEvent<SVGSVGElement>) {
    const frame = frameRef.current;
    if (!frame || geometry.points.length === 0) return;
    const x = viewBoxX(event.currentTarget, event.clientX, event.clientY);
    if (x == null) return;
    const index = chartIndexForViewX(x, geometry.points.length);
    const point = geometry.points[index];
    if (!point) return;
    const left = Math.round(tooltipLeft(event.currentTarget, frame, point.x));
    setActive((current) =>
      current?.index === index && current.left === left
        ? current
        : { index, left },
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-baseline gap-4">
            <p className="text-7xl font-medium tabular-nums tracking-[-0.06em] md:text-8xl">
              {formatCount(totalClicks)}
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
              <> · {formatCount(previousTotalClicks)} in the period before</>
            )}
          </p>
        </div>
        {aside}
      </div>
      <div ref={frameRef} className="relative mt-8 h-64 w-full md:h-80">
        <svg
          viewBox={`0 0 ${CHART_VIEW_W} ${CHART_VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full cursor-crosshair text-brand"
          aria-label={`${formatCount(totalClicks)} clicks, ${periodLabel.toLowerCase()}`}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") setActive(null);
          }}
          onPointerMove={selectFromPointer}
          onPointerDown={selectFromPointer}
        >
          <line
            x1={CHART_PAD_X}
            x2={CHART_VIEW_W - CHART_PAD_X}
            y1={CHART_VIEW_H - PAD_BOTTOM}
            y2={CHART_VIEW_H - PAD_BOTTOM}
            className="stroke-border"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x="4"
            y={PAD_TOP}
            fontSize="11"
            dominantBaseline="hanging"
            className="fill-muted-foreground"
          >
            {formatCount(geometry.max)}
          </text>
          <text
            x="4"
            y={CHART_VIEW_H - PAD_BOTTOM - 6}
            fontSize="11"
            textAnchor="start"
            className="fill-muted-foreground"
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
              vectorEffect="non-scaling-stroke"
            />
          )}
          {activePoint && (
            <>
              <line
                x1={activePoint.x}
                x2={activePoint.x}
                y1={PAD_TOP}
                y2={CHART_VIEW_H - PAD_BOTTOM}
                className="stroke-border"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
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
                key={`${point.point.date}-${index}`}
                x={point.x}
                y={CHART_VIEW_H - 8}
                fontSize="11"
                textAnchor="middle"
                className="fill-muted-foreground"
              >
                {point.point.date}
              </text>
            );
          })}
        </svg>
        <div className="sr-only" aria-live="polite">
          {activePoint
            ? `${activePoint.point.date}, ${formatCount(activePoint.point.clicks)} clicks`
            : ""}
        </div>
        <ul className="sr-only">
          {chartData.map((point, index) => (
            <li key={`${point.date}-${index}`}>
              {point.date}: {formatCount(point.clicks)} clicks
            </li>
          ))}
        </ul>
        {activePoint && (
          <div
            className="pointer-events-none absolute top-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs shadow-sm"
            style={{ left: active?.left ?? 0 }}
          >
            <p className="text-muted-foreground">{activePoint.point.date}</p>
            <p className="font-medium tabular-nums">
              {formatCount(activePoint.point.clicks)} clicks
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
