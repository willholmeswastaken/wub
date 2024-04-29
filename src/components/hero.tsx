'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { useForm, SubmitHandler } from "react-hook-form"
import { Spinner } from "./ui/spinner";
import { toast } from "sonner";
import copy from 'clipboard-copy';
import { parseUrl } from "@/lib/url";

type UrlInput = {
    url: string;
}

export function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue
    } = useForm<UrlInput>();

    const onShortLinkSuccess = (shortCode: string) => {
        const shortLink = `${window.location.origin}/${shortCode}`;
        toast.success("Short link created!", {
            description: shortLink,
            action: {
                label: "Copy link",
                onClick: () => {
                    void copy(shortLink);
                },
            },
        });
        setValue("url", "");
    }

    const { mutate: anonMutate, isPending: anonMutatePending } = api.link.createAnon.useMutation({
        onSuccess(shortCode) {
            onShortLinkSuccess(shortCode);
        }
    });
    const { mutate: loggedInMutate, isPending: loggedInMutatePending } = api.link.create.useMutation({
        onSuccess(shortCode) {
            onShortLinkSuccess(shortCode);
        }
    });

    const onSubmit: SubmitHandler<UrlInput> = ({ url }) => {
        const parsedUrl = parseUrl(url);
        if (isLoggedIn) {
            loggedInMutate({ url: parsedUrl });
        } else {
            anonMutate({ url: parsedUrl });
        }
    }

    return (
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
            <div className="container px-4 md:px-6">
                <div className="flex flex-col items-center space-y-4 text-center">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none max-w-2xl">
                            Short Links That Change The World
                        </h1>
                        <p className="mx-auto max-w-[525px] text-gray-500 md:text-xl dark:text-gray-400">
                            Wub is the open-source link shortener that is built to scale.
                        </p>
                    </div>
                    <div className="w-full max-w-sm space-y-2">
                        <div className="flex flex-col">
                            <form className="flex space-x-2" onSubmit={handleSubmit(onSubmit)}>
                                <Input
                                    className="max-w-lg flex-1"
                                    placeholder="Enter a long URL"
                                    {...register("url", { required: true })}
                                />

                                <Button type="submit" className="w-20">
                                    {
                                        anonMutatePending || loggedInMutatePending
                                            ? (<Spinner size='small' className="text-white" />)
                                            : 'Shorten'
                                    }
                                </Button>
                            </form>
                            {errors.url && <span className="text-left text-sm text-red-600 pl-1">Please enter a url</span>}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}