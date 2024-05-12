import { Button } from "./ui/button";

export function AppHeader() {
    return (
        <section className="flex justify-center items-center border-y border-gray-200 p-10">
            <div className="mx-auto max-w-2xl w-full">
                <h1 className="text-2xl text-gray-600">Links</h1>
            </div>
            <Button>Create New</Button>
        </section>
    );
}