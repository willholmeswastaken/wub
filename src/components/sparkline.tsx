import { cn } from "@/lib/utils";

export function Sparkline({
  values,
  className,
  width = 56,
  height = 20,
}: {
  values: number[];
  className?: string;
  width?: number;
  height?: number;
}) {
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values
    .map((value, index) => {
      const x = index * step;
      const y = height - 2 - (value / max) * (height - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const hasClicks = values.some((value) => value > 0);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden
      className={cn(
        "shrink-0 overflow-visible",
        hasClicks ? "text-brand" : "text-border",
        className,
      )}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
