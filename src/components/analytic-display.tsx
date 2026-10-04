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
    <div className="py-3">
      <div className="flex items-baseline gap-3 text-sm">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {icon && (
            <span className="flex w-5 shrink-0 justify-center text-muted-foreground">
              {icon}
            </span>
          )}
          <span className="truncate">{label}</span>
        </div>
        <span className="shrink-0 font-medium tabular-nums tracking-[-0.02em]">
          {clicks.toLocaleString()}
        </span>
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {percentOf(clicks, total)}
        </span>
      </div>
      <div className="mt-2 h-px bg-border" aria-hidden>
        <div className="h-px bg-foreground" style={{ width: `${share}%` }} />
      </div>
    </div>
  );
}
