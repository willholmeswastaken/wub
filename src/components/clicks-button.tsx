import { BarChartIcon } from "lucide-react";
import Link from "next/link";

export function ClicksButton({
  clicks,
  href,
}: {
  clicks: number;
  href?: string;
}) {
  const content = (
    <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-sm text-muted-foreground">
      <BarChartIcon className="h-3.5 w-3.5" aria-hidden />
      <span className="hidden sm:inline">{clicks} clicks</span>
      <span className="sm:hidden">{clicks}</span>
    </span>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="hover:opacity-80" aria-label="View analytics">
      {content}
    </Link>
  );
}
