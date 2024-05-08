'use client';

import { useLinkStore } from "@/stores/link";
import ShortLink from "./short-link";
import { motion } from "framer-motion";
import { api } from "@/trpc/react";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2,
        },
    },
};

const item = {
    hidden: { scale: 0 },
    show: { scale: 1, transition: { duration: 0.4, type: "spring" } },
};

export default function LinkStackView() {
    const links = useLinkStore(state => state.links);
    const { data } = api.link.getTempLinks.useQuery(links.map(link => link.shortCode))
    if (links.length === 0) return null;
    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col space-y-3">
            {links.map((link) => (
                <motion.div key={link.shortUrl} variants={item} className="item">
                    <ShortLink
                        url={link.url}
                        clicks={data?.find(tl => tl.short_code === link.shortCode)?.click_count ?? link.clicks}
                        shortUrl={link.shortUrl}
                        expiresAt={link.expiresAt}
                    />
                </motion.div>
            ))}
        </motion.div>
    )
}