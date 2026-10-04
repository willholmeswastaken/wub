"use client";

import { type TempLink, useHydrated, useLinkStore } from "@/stores/link";
import { api } from "@/trpc/react";
import { motion } from "framer-motion";
import { ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";

import ShortLink from "./short-link";

const container = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

function createdTime(link: TempLink) {
  if (link.createdAt) return new Date(link.createdAt).getTime();
  return link.expiresAt ? new Date(link.expiresAt).getTime() - 30 * 60_000 : 0;
}

function isExpired(link: TempLink) {
  return !!link.expiresAt && new Date(link.expiresAt).getTime() <= Date.now();
}

function LinkList({
  links,
  clicksFor,
}: {
  links: TempLink[];
  clicksFor: (link: TempLink) => number;
}) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="surface overflow-hidden"
    >
      {links.map((link, index) => (
        <motion.div
          key={link.shortCode}
          variants={item}
          className={index > 0 ? "border-t border-border" : undefined}
        >
          <ShortLink
            url={link.url}
            clicks={clicksFor(link)}
            shortUrl={link.shortUrl}
            expiresAt={link.expiresAt}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

export default function LinkStackView({
  excludeCode,
}: {
  excludeCode?: string | null;
}) {
  const hydrated = useHydrated();
  const links = useLinkStore((state) => state.links);
  const sortedLinks = [...links].sort(
    (a, b) => createdTime(b) - createdTime(a),
  );
  const { data } = api.link.getTempLinks.useQuery(
    sortedLinks.map((link) => link.shortCode),
    {
      enabled: hydrated && sortedLinks.length > 0,
    },
  );
  if (!hydrated) return null;

  const visibleLinks = sortedLinks.filter(
    (link) => link.shortCode !== excludeCode,
  );
  if (visibleLinks.length === 0) return null;

  const activeLinks = visibleLinks.filter((link) => !isExpired(link));
  const expiredLinks = visibleLinks.filter(isExpired);
  const clicksFor = (link: TempLink) =>
    data?.find((tempLink) => tempLink.short_code === link.shortCode)
      ?.click_count ?? link.clicks;

  return (
    <div className="space-y-3 pt-4 text-left">
      <div className="flex items-center justify-between gap-4 px-1">
        <h2 className="text-sm font-medium text-muted-foreground">
          Recent links
        </h2>
        <Link
          href="/signin?callbackUrl=/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
        >
          Keep them forever
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {activeLinks.length > 0 && (
        <LinkList links={activeLinks} clicksFor={clicksFor} />
      )}
      {expiredLinks.length > 0 && (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1 px-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
            Expired ({expiredLinks.length})
          </summary>
          <div className="mt-2">
            <LinkList links={expiredLinks} clicksFor={clicksFor} />
          </div>
        </details>
      )}
    </div>
  );
}
