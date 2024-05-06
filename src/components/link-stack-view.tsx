'use client';

import ShortLink from "./short-link";
import { motion } from "framer-motion";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const item = {
    hidden: { scale: 0 },
    show: { scale: 1, transition: { duration: 0.25, type: "spring" } },
};

export default function LinkStackView() {
    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col space-y-3">
            {[1, 2, 3, 4].map((i) => (
                <motion.div key={i} variants={item} className="item">
                    <ShortLink
                        url="https://drizzle.team"
                        clicks={100}
                    />
                </motion.div>
            ))}
        </motion.div>
    )
}