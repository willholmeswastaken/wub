export function Footer() {
  return (
    <footer className="flex w-full shrink-0 items-center justify-center border-t border-border px-4 py-6 md:px-6">
      <p className="text-xs text-muted-foreground">
        © {new Date().getFullYear()} Wub. Open-source URL shortener.
      </p>
    </footer>
  );
}
