import { BarChartIcon } from "lucide-react";

export function ClicksButton({ clicks }: { clicks: number }) {
    return (
        <div className="flex flex-row space-x-1 bg-gray-100 p-1.5 rounded-lg items-center text-sm transition-all hover:scale-105 hover:cursor-pointer">
            <BarChartIcon width={14} height={14} className="text-gray-700" />
            <span className="hidden sm:block">{clicks} clicks</span>
            <span className="sm:hidden">{clicks}</span>
        </div>
    )
};
