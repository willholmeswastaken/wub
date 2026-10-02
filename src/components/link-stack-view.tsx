"use client";

import { useLinkStore } from "@/stores/link";
import { api } from "@/trpc/react";
import { motion } from "framer-motion";

import ShortLink from "./short-link";

const container = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export default function LinkStackView({
  excludeCode,
}: {
  excludeCode?: string | null;
}) {
  const links = useLinkStore((state) => state.links);
  const sortedLinks = [...links].sort(
    (a, b) =>
      new Date(b.expiresAt ?? 0).getTime() -
      new Date(a.expiresAt ?? 0).getTime(),
  );
  const { data } = api.link.getTempLinks.useQuery(
    sortedLinks.map((link) => link.shortCode),
    {
      enabled: sortedLinks.length > 0,
    },
  );
  const visibleLinks = sortedLinks.filter(
    (link) => link.shortCode !== excludeCode,
  );
  if (visibleLinks.length === 0) return null;
  return (
    <div className="space-y-2 pt-4 text-left">
      <h2 className="px-1 text-sm font-medium text-muted-foreground">
        Recent links
      </h2>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="overflow-hidden rounded-2xl border border-border bg-background"
      >
        {visibleLinks.map((link, index) => (
          <motion.div
            key={link.shortUrl}
            variants={item}
            className={index > 0 ? "border-t border-border" : undefined}
          >
            <ShortLink
              url={link.url}
              clicks={
                data?.find((tempLink) => tempLink.short_code === link.shortCode)
                  ?.click_count ?? link.clicks
              }
              shortUrl={link.shortUrl}
              expiresAt={link.expiresAt}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
