import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full shrink-0 border-t border-border bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row">
        <p>© 2026 Wub. Free and open source.</p>
        <nav className="sm:ml-auto">
          <Link
            className="underline-offset-4 hover:underline"
            href="https://github.com/willholmeswastaken/wub"
            target="_blank"
            rel="noreferrer"
          >
            Star us on GitHub
          </Link>
        </nav>
      </div>
    </footer>
  );
}
