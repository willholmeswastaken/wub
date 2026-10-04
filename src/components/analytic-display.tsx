import { percentOf } from "@/lib/format";
import { type ReactNode } from "react";

export function AnalyticDisplay({
  icon,
  label,
  clicks,
  total,
}: {
  icon?: ReactNode;
  label: string;
  clicks: number;
  total: number;
}) {
  const share = total > 0 ? Math.min(100, (clicks / total) * 100) : 0;

  return (
    <div className="relative flex h-10 items-center gap-3 overflow-hidden rounded-xl px-3 text-sm">
      <div
        className="absolute inset-y-0 left-0 rounded-lg bg-brand/10"
        style={{ width: `${share}%` }}
        aria-hidden
      />
      <div className="relative flex min-w-0 flex-1 items-center gap-2">
        {icon && (
          <span className="flex w-5 shrink-0 justify-center text-muted-foreground">
            {icon}
          </span>
        )}
        <span className="truncate">{label}</span>
      </div>
      <span className="relative shrink-0 tabular-nums">
        {clicks.toLocaleString()}
      </span>
      <span className="relative w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {percentOf(clicks, total)}
      </span>
    </div>
  );
}
