import { CreateLink } from "@/components/create-link";

export function AppHeader({ pageTitle, hideCta }: { pageTitle: string, hideCta?: boolean }) {
    return (
        <section className="border-y border-gray-200 p-10 bg-white">
            <div className="mx-auto max-w-4xl w-full flex items-center justify-between">
                <h1 className="text-2xl text-gray-600">{pageTitle}</h1>
                {!hideCta && <CreateLink />}
            </div>
        </section>
    );
}