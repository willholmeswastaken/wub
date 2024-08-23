import { BarChartIcon } from "lucide-react";

export function ClicksButton({ clicks }: { clicks: number }) {
  return (
    <div className="flex h-fit flex-row items-center space-x-1 rounded-lg bg-gray-100 p-1.5 text-sm transition-all hover:scale-105 hover:cursor-pointer">
      <BarChartIcon width={14} height={14} className="text-gray-700" />
      <span className="hidden sm:block">{clicks} clicks</span>
      <span className="sm:hidden">{clicks}</span>
    </div>
  );
}
