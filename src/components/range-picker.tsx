import { CLICK_RANGES, type ClickRange } from "@/lib/click-date-range";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function RangePicker({
  code,
  value,
}: {
  code: string;
  value: ClickRange;
}) {
  return (
    <nav
      aria-label="Date range"
      className="flex rounded-full bg-muted p-1 text-sm"
    >
      {CLICK_RANGES.map((range) => (
        <Link
          key={range}
          href={`/analytics/${code}?range=${range}`}
          scroll={false}
          aria-current={range === value ? "page" : undefined}
          className={cn(
            "rounded-full px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            range === value && "bg-background text-foreground shadow-sm",
          )}
        >
          {range}
        </Link>
      ))}
    </nav>
  );
}
