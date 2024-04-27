import { LinkIcon } from "@/components/link-icon"

export function WhyUs() {
    return (
        <section className="w-full py-12 md:py-24 lg:py-32">
            <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6 lg:gap-10">
                <div className="space-y-3">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                        Why Choose Our Link Shortener?
                    </h2>
                    <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                        Our link shortener offers a range of features to help you streamline your online presence. Batch link
                        shortening, custom domains, and advanced analytics put you in control.
                    </p>
                </div>
                <div className="grid w-full grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                            <LinkIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                        </div>
                        <h3 className="mt-4 text-xl font-bold">Batch Link Shortening</h3>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">Save time by shortening multiple links at once.</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                            <GlobeIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                        </div>
                        <h3 className="mt-4 text-xl font-bold">Custom Domains</h3>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">
                            Use your own domain to create branded, memorable links.
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                            <PieChartIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                        </div>
                        <h3 className="mt-4 text-xl font-bold">Advanced Analytics</h3>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">
                            Track clicks, referrers, and more to optimize your links.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}

// @ts-expect-error its okay
function GlobeIcon(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="2" x2="22" y1="12" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
    )
}

// @ts-expect-error its okay
function PieChartIcon(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
            <path d="M22 12A10 10 0 0 0 12 2v10z" />
        </svg>
    )
}
