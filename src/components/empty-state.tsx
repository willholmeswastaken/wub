export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      {description ? (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </div>
  );
}
