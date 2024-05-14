import { CreateLink } from "@/components/create-link";

export function AppHeader() {
    return (
        <section className="border-y border-gray-200 p-10 bg-white">
            <div className="mx-auto max-w-3xl w-full flex items-center justify-between">
                <h1 className="text-2xl text-gray-600">Links</h1>
                <CreateLink />
            </div>
        </section>
    );
}