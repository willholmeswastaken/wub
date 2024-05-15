import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';

type TempLink = {
    url: string;
    clicks: number;
    shortUrl: string;
    expiresAt?: Date | null;
    shortCode: string;
};

export const useLinkStore = create<{ links: Array<TempLink>, addLink: (link: TempLink) => void, deleteLink: (shortCode: string) => void }>()(
    devtools(
        persist(
            (set) => ({
                links: [],
                addLink: (link) => set((state) => ({ links: [...state.links, link] })),
                deleteLink: (shortCode: string) => set((state) => ({ links: state.links.filter(link => link.shortCode !== shortCode) })),
            }),
            {
                name: 'temp-link-storage', // name of the item in the storage (must be unique)
                storage: createJSONStorage(() => sessionStorage), // (optional) by default, 'localStorage' is used
            },
        ),
    ),
)