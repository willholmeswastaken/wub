import { CreateLink } from "@/components/create-link";

export function AppHeader({
  pageTitle,
  hideCta,
}: {
  pageTitle: string;
  hideCta?: boolean;
}) {
  return (
    <section className="border-y border-gray-200 bg-white p-10">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <h1 className="text-2xl text-gray-600">{pageTitle}</h1>
        {!hideCta && <CreateLink />}
      </div>
    </section>
  );
}
