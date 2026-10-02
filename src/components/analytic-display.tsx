import { cn } from "@/lib/utils";
import Image from "next/image";

export function AnalyticDisplay({
  name,
  iconUrl,
  displayName,
  clicks,
  total,
  imageClassName,
}: {
  name: string;
  iconUrl: string;
  displayName: string;
  clicks: number;
  total: number;
  imageClassName?: string;
}) {
  const share = total > 0 ? Math.min(100, (clicks / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <Image
            alt={name}
            src={iconUrl}
            className={cn("h-3 w-5 shrink-0", imageClassName)}
            width={20}
            height={20}
          />
          <span className="truncate capitalize">{displayName}</span>
        </div>
        <span className="shrink-0 tabular-nums">{clicks}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground"
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  );
}
