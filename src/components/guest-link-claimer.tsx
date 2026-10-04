"use client";

import {
  useClaimableLinks,
  useHydrated,
  useLinkStore,
  useRecentlyClaimed,
} from "@/stores/link";
import { api } from "@/trpc/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function GuestLinkClaimer() {
  const hydrated = useHydrated();
  const claimable = useClaimableLinks();
  const removeLinks = useLinkStore((state) => state.removeLinks);
  const setClaimedCodes = useRecentlyClaimed((state) => state.setCodes);
  const utils = api.useUtils();
  const { mutateAsync: claim } = api.link.claim.useMutation();
  const router = useRouter();
  const pathname = usePathname();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!hydrated || startedRef.current || claimable.length === 0) return;
    startedRef.current = true;
    const attempted = claimable.map((link) => ({
      shortCode: link.shortCode,
      claimToken: link.claimToken!,
    }));

    claim(attempted)
      .then(async ({ claimed }) => {
        removeLinks(attempted.map((link) => link.shortCode));
        if (claimed.length === 0) return;
        setClaimedCodes(claimed);
        await utils.link.getUserLinks.invalidate();
        toast.success(
          claimed.length === 1
            ? "Saved your link to your account"
            : `Saved ${claimed.length} links to your account`,
          {
            description: "They won't expire any more.",
            action:
              pathname === "/dashboard"
                ? undefined
                : {
                    label: "View",
                    onClick: () => router.push("/dashboard"),
                  },
          },
        );
      })
      .catch(() => {
        startedRef.current = false;
      });
  }, [
    hydrated,
    claimable,
    claim,
    removeLinks,
    setClaimedCodes,
    utils,
    pathname,
    router,
  ]);

  return null;
}
