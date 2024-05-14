'use client';

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { type links } from "@/server/db/schema";
import { api } from "@/trpc/react";
import { type InferInsertModel } from "drizzle-orm";
import { type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import copy from 'clipboard-copy';
import { parseUrl } from "@/lib/url";
import { useRef } from "react";

type UrlInput = {
    url: string;
}

export function CreateLink() {
    const dialogTrigger = useRef<HTMLButtonElement | null>(null);
    const utils = api.useUtils();
    const createLinkMutate = api.link.create.useMutation({
        onSuccess: async (link: InferInsertModel<typeof links>) => {
            const shortLink = `${window.location.origin}/${link.short_code}`;
            toast.success("Short link created!", {
                description: shortLink,
                action: {
                    label: "Copy link",
                    onClick: () => {
                        void copy(shortLink);
                    },
                },
            });
            await utils.link.getUserLinks.refetch();
            reset();
            dialogTrigger.current?.click();
        }
    });
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm<UrlInput>();

    const onSubmit: SubmitHandler<UrlInput> = ({ url }) => {
        const parsedUrl = parseUrl(url);
        createLinkMutate.mutate({ url: parsedUrl });
    }

    return (
        <Dialog>
            <DialogTrigger asChild ref={dialogTrigger}>
                <Button>Create Link</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create a new link</DialogTitle>
                </DialogHeader>
                <form className="flex flex-col items-start gap-1" onSubmit={handleSubmit(onSubmit)}>
                    <Label htmlFor="url" className="text-xs">
                        Destination Url
                    </Label>
                    <Input
                        placeholder="https://willholmes.dev"
                        className="col-span-3"
                        {...register("url", { required: true })}
                    />
                    {errors.url && <span className="text-left text-sm text-red-600 pl-1">Please enter a url</span>}
                    <DialogFooter>
                        <Button type="submit">Create Link</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}