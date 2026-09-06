import { type LucideIcon } from "lucide-react";

export function EmptyState({
  title,
  description,
  children,
  icon: Icon,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      {Icon ? (
        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-5" aria-hidden />
        </div>
      ) : null}
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      {description ? (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </div>
  );
}
