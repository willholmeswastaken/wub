export default function DashboardLoading() {
  return (
    <div className="space-y-10">
      <div className="border-y border-border bg-card p-10">
        <div className="mx-auto h-8 w-32 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-2 px-2 sm:grid-cols-2">
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
