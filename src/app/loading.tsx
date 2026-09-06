export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
