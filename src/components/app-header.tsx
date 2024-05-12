import { FullLinkCard } from "@/components/full-link-card";
import { Button } from "@/components/ui/button";

export function AppHeader() {
    return (
        <div className="flex flex-col space-y-10">
            <section className="flex justify-center items-center border-y border-gray-200 p-10 bg-white">
                <div className="mx-auto max-w-2xl w-full">
                    <h1 className="text-2xl text-gray-600">Links</h1>
                </div>
                <Button>Create New</Button>
            </section>
            <section className="h-full flex-1 mx-auto max-w-2xl w-full">
                <FullLinkCard />
            </section>
        </div>
    );
}