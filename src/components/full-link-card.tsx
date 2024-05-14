import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CopyButton } from "@/components/copy-button";
import { ClicksButton } from "@/components/clicks-button";

export function FullLinkCard({ shortCode, url, clicks, createdAt }: { shortCode: string, url: string, clicks: number, createdAt: Date }) {
    return (
        <div className="w-full bg-white rounded-lg shadow-lg p-4 border-gray-50 hover:shadow-xl duration-200 transition-all hover:cursor-pointer">
            <div className="flex items-center justify-between relative">
                <div className="relative flex shrink items-start">
                    <Avatar>
                        <AvatarImage src="https://github.com/shadcn.png" />
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <div className="ml-2 sm:ml-4">
                        <div className="flex max-w-fit flex-wrap items-center gap-x-2">
                            <a href="#" className="text-sm font-semibold">wub.sh/{shortCode}</a>
                            <CopyButton
                                isExpired={false}
                                text={`wub.sh/${shortCode}`}
                            />
                        </div>
                        <div className="flex max-w-fit flex-wrap items-center gap-x-2 text-sm font-normal text-gray-600">
                            <span>May 14</span>
                            <span>-</span>
                            <a href="#" className="hover:underline">{url}</a>
                        </div>
                    </div>
                </div>
                <div>
                    <ClicksButton clicks={clicks} />
                </div>
            </div>
        </div>
    )
}