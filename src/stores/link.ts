import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";

export type TempLink = {
  url: string;
  clicks: number;
  shortUrl: string;
  expiresAt?: Date | string | null;
  shortCode: string;
  createdAt?: string;
  claimToken?: string | null;
};

const PRUNE_AFTER_MS = 24 * 60 * 60 * 1000;

function isStale(link: TempLink) {
  if (!link.expiresAt) return false;
  return Date.now() - new Date(link.expiresAt).getTime() > PRUNE_AFTER_MS;
}

export const useLinkStore = create<{
  links: Array<TempLink>;
  addLink: (link: TempLink) => void;
  deleteLink: (shortCode: string) => void;
  removeLinks: (shortCodes: string[]) => void;
}>()(
  devtools(
    persist(
      (set) => ({
        links: [],
        addLink: (link) =>
          set((state) => ({
            links: [
              {
                ...link,
                createdAt: link.createdAt ?? new Date().toISOString(),
              },
              ...state.links.filter(
                (existing) =>
                  existing.shortCode !== link.shortCode && !isStale(existing),
              ),
            ],
          })),
        deleteLink: (shortCode: string) =>
          set((state) => ({
            links: state.links.filter((link) => link.shortCode !== shortCode),
          })),
        removeLinks: (shortCodes: string[]) =>
          set((state) => ({
            links: state.links.filter(
              (link) => !shortCodes.includes(link.shortCode),
            ),
          })),
      }),
      {
        name: "wub-guest-links",
        storage: createJSONStorage(() => localStorage),
        merge: (persisted, current) => ({
          ...current,
          links: ((persisted as { links?: TempLink[] })?.links ?? []).filter(
            (link) => !isStale(link),
          ),
        }),
      },
    ),
  ),
);

export function useClaimableLinks() {
  return useLinkStore((state) => state.links).filter(
    (link) => !!link.claimToken,
  );
}

const noopSubscribe = () => () => undefined;

export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export const useRecentlyClaimed = create<{
  codes: string[];
  setCodes: (codes: string[]) => void;
}>()((set) => ({
  codes: [],
  setCodes: (codes) => set({ codes }),
}));
