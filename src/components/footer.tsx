import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full shrink-0 bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 border-t border-border/70 px-6 py-8 text-[13px] text-muted-foreground sm:flex-row md:px-8">
        <p>© 2026 Wub. Free and open source.</p>
        <nav className="sm:ml-auto">
          <Link
            className="transition-colors hover:text-foreground"
            href="https://github.com/willholmeswastaken/wub"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </Link>
        </nav>
      </div>
    </footer>
  );
}
