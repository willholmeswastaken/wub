import { cn } from "@/lib/utils";
import Image from "next/image";

export function AnalyticDisplay({
  name,
  iconUrl,
  displayName,
  clicks,
  imageClassName,
  infoContainerClassName,
}: {
  name: string;
  iconUrl: string;
  displayName: string;
  clicks: number;
  imageClassName?: string;
  infoContainerClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between leading-3",
        infoContainerClassName,
      )}
    >
      <div className="flex flex-row items-start space-x-2">
        <Image
          alt={name}
          src={iconUrl}
          className={cn("h-3 w-5", imageClassName)}
          width={20}
          height={20}
        />
        <span className="capitalize">{displayName}</span>
      </div>
      <span>{clicks}</span>
    </div>
  );
}
