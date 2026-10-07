import { formatWindowDelta } from "@/lib/click-delta";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function ClickDelta({
  current,
  previous,
  hideFlat = false,
  className,
}: {
  current: number;
  previous: number;
  hideFlat?: boolean;
  className?: string;
}) {
  const delta = formatWindowDelta(current, previous, { hideFlat });
  if (!delta) return null;

  const Icon =
    delta.label === "New" || delta.tone === "flat"
      ? null
      : delta.tone === "up"
        ? ArrowUpRight
        : ArrowDownRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 whitespace-nowrap font-medium tabular-nums",
        delta.tone === "up" && "text-emerald-700 dark:text-emerald-400",
        delta.tone === "down" && "text-destructive",
        delta.tone === "flat" && "text-muted-foreground",
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
      {delta.label}
    </span>
  );
}
