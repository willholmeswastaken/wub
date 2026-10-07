import { cn } from "@/lib/utils";

export function ShareBar({
  share,
  className,
}: {
  share: number;
  className?: string;
}) {
  const width = Number.isFinite(share) ? Math.min(100, Math.max(0, share)) : 0;

  return (
    <div
      className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}
      aria-hidden
    >
      <div
        className="h-full rounded-full bg-foreground"
        style={{ width: width > 0 ? `max(${width}%, 0.25rem)` : "0%" }}
      />
    </div>
  );
}
