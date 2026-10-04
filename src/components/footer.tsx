import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative w-full shrink-0 overflow-hidden border-t-2 border-foreground bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          © 2026 Wub · Free and open source
        </p>
        <nav className="sm:ml-auto">
          <Link
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground underline decoration-brand decoration-2 underline-offset-[5px] hover:text-brand"
            href="https://github.com/willholmeswastaken/wub"
            target="_blank"
            rel="noreferrer"
          >
            Star the source
          </Link>
        </nav>
      </div>
      <p
        aria-hidden
        className="pointer-events-none -mb-[0.22em] select-none text-center font-display text-[clamp(6.5rem,30vw,18rem)] font-medium italic leading-[0.72] text-foreground/[0.12]"
      >
        wub
      </p>
    </footer>
  );
}
