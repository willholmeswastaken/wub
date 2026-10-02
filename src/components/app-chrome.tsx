"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

export function AppChrome({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isProduct =
    pathname === "/dashboard" || pathname.startsWith("/analytics");

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {!isProduct && header}
      <main className="flex-1 bg-muted/40">{children}</main>
      {!isProduct && footer}
    </div>
  );
}
