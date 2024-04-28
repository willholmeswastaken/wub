'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { useState } from "react";

export function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
    const anonCreate = api.link.createAnon.useMutation({
        onSuccess(shortCode) {
            // alert(`Shortened URL: ${window.location.origin}/${shortCode}`);
        }
    });
    const loggedInCreate = api.link.create.useMutation();
    const [url, setUrl] = useState('');

    const parseUrl = () => !url.startsWith('http://') || !url.startsWith('https://')
        ? `https://${url}`
        : url;
    return (
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
            <div className="container px-4 md:px-6">
                <div className="flex flex-col items-center space-y-4 text-center">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                            Shorten Your Links
                        </h1>
                        <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                            Simplify your online presence with our powerful link shortening tool. Get custom, branded links in
                            seconds.
                        </p>
                    </div>
                    <div className="w-full max-w-sm space-y-2">
                        <form className="flex space-x-2" onSubmit={e => {
                            // todo: tidy up so that the value of the url is retrieved from state. Eventually will use a form lib.
                            e.preventDefault();
                            if (isLoggedIn) {
                                loggedInCreate.mutate({ url: parseUrl() });
                            } else {
                                anonCreate.mutate({ url: parseUrl() });
                            }
                        }}>
                            <Input className="max-w-lg flex-1" placeholder="Enter a long URL" onChange={e => setUrl(e.target.value)} />
                            <Button type="submit">Shorten</Button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    )
}