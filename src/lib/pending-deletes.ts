"use client";

import { useLinkStore } from "@/stores/link";
import { api } from "@/trpc/react";
import { useCallback } from "react";
import { toast } from "sonner";
import { create } from "zustand";

const UNDO_WINDOW_MS = 5000;

export const usePendingDeletes = create<{
  codes: string[];
  add: (code: string) => void;
  remove: (code: string) => void;
}>()((set) => ({
  codes: [],
  add: (code) => set((state) => ({ codes: [...state.codes, code] })),
  remove: (code) =>
    set((state) => ({ codes: state.codes.filter((c) => c !== code) })),
}));

const timers = new Map<string, number>();

export function useScheduleDelete() {
  const utils = api.useUtils();
  const removeGuestLink = useLinkStore((state) => state.deleteLink);

  return useCallback(
    (shortCode: string, label: string) => {
      const { add, remove } = usePendingDeletes.getState();
      add(shortCode);

      const undo = () => {
        const timer = timers.get(shortCode);
        if (timer) window.clearTimeout(timer);
        timers.delete(shortCode);
        remove(shortCode);
      };

      const timer = window.setTimeout(() => {
        timers.delete(shortCode);
        utils.client.link.deleteLink
          .mutate(shortCode)
          .then(async () => {
            removeGuestLink(shortCode);
            await utils.link.getUserLinks.invalidate();
          })
          .catch(() => {
            toast.error("Could not delete that link");
          })
          .finally(() => remove(shortCode));
      }, UNDO_WINDOW_MS);
      timers.set(shortCode, timer);

      toast("Link deleted", {
        description: label,
        duration: UNDO_WINDOW_MS,
        action: { label: "Undo", onClick: undo },
      });
    },
    [utils, removeGuestLink],
  );
}
