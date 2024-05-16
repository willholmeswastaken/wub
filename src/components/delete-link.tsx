'use client';

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/trpc/react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { GlobeIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { getProjectUrl } from "@/lib/project-url";
import { useLinkStore } from "@/stores/link";
import { type Dispatch, type SetStateAction } from "react";

type UrlInput = {
    url: string;
}

export function DeleteLink({ shortCode, isOpen, setIsOpen }: { shortCode: string, isOpen: boolean, setIsOpen: Dispatch<SetStateAction<boolean>> }) {
    const expectedDeletionLink = `${getProjectUrl(false)}${shortCode}`;
    const utils = api.useUtils();
    const deleteLinkFromCache = useLinkStore(state => state.deleteLink);

    const deleteLink = api.link.deleteLink.useMutation({
        onSuccess: async () => {
            await utils.link.getUserLinks.refetch();
            toast.success("Link deleted successfully!");
            reset();
            deleteLinkFromCache(shortCode);
            setIsOpen(false);
        }
    });

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setError
    } = useForm<UrlInput>();

    const onSubmit: SubmitHandler<UrlInput> = ({ url }) => {
        if (url !== expectedDeletionLink) {
            setError("url", { message: "Url does not match" })
            return;
        }
        deleteLink.mutate(shortCode);
    }

    return (
        <Dialog open={isOpen} onOpenChange={() => setIsOpen(prev => !prev)}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex flex-col justify-center items-center space-x-2 text-lg font-medium">
                        <div className="bg-gray-100 p-2 rounded-full">
                            <GlobeIcon className="w-6 h-6" />
                        </div>
                        <span>Delete {expectedDeletionLink}</span>
                    </DialogTitle>
                    <DialogDescription className="text-sm text-center">
                        Warning: Deleting this link will remove all of its analytics. This action cannot be undone, proceed with caution.
                    </DialogDescription>
                </DialogHeader>
                <form className="flex flex-col items-start gap-1 w-full" onSubmit={handleSubmit(onSubmit)}>
                    <Label htmlFor="url" className="text-sm font-normal">
                        To verify, type&nbsp;<span className="font-semibold">{expectedDeletionLink}</span>&nbsp;below
                    </Label>
                    <Input
                        className="col-span-3"
                        {...register("url", { required: true })}
                    />
                    {errors.url && <span className="text-left text-sm text-red-600 pl-1">{errors.url.message}</span>}
                    <DialogFooter className="w-full pt-2">
                        <Button variant={"destructive"} type="submit" className="w-full" disabled={deleteLink.isPending}>
                            Confirm delete
                            <Spinner className="ml-2 text-white h-4 w-4" show={deleteLink.isPending} />
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}