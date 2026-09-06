export default function AnalyticsLoading() {
  return (
    <div className="flex flex-col space-y-10 pb-10">
      <div className="border-y border-border bg-card p-10">
        <div className="mx-auto h-8 w-40 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="mx-auto h-72 w-full max-w-4xl animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
