import Link from "next/link";

export function Footer() {
  return (
    <footer className="flex w-full shrink-0 flex-col items-center gap-2 border-t bg-background px-4 py-6 sm:flex-row">
      <p className="text-xs text-muted-foreground">
        © 2026 Wub Technologies. All rights reserved.
      </p>
      <nav className="sm:ml-auto">
        <Link
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          href="https://github.com/willholmeswastaken/wub"
          target="_blank"
          rel="noreferrer"
        >
          Star us on GitHub
        </Link>
      </nav>
    </footer>
  );
}
