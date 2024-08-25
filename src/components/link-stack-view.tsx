"use client";

import { useLinkStore } from "@/stores/link";
import ShortLink from "./short-link";
import { motion } from "framer-motion";
import { api } from "@/trpc/react";

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
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function LinkStackView() {
  const links = useLinkStore((state) =>
    state.links.sort(
      (a, b) =>
        new Date(b.expiresAt ?? 0).getTime() -
        new Date(a.expiresAt ?? 0).getTime(),
    ),
  );
  const { data } = api.link.getTempLinks.useQuery(
    links.map((link) => link.shortCode),
    {
      enabled: links.length > 0,
    },
  );
  if (links.length === 0) return null;
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-3"
    >
      {links.map((link) => (
        <motion.div key={link.shortUrl} variants={item}>
          <ShortLink
            url={link.url}
            clicks={
              data?.find((tl) => tl.short_code === link.shortCode)
                ?.click_count ?? link.clicks
            }
            shortUrl={link.shortUrl}
            expiresAt={link.expiresAt}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
