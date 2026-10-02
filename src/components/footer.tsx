import Link from "next/link";

export function Footer() {
  return (
    <footer className="flex w-full shrink-0 flex-col items-center gap-2 border-t px-4 py-6 sm:flex-row md:px-6">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        © 2024 Wub Technologies. All rights reserved.
      </p>
      <nav className="flex gap-4 sm:ml-auto sm:gap-6">
        <span className="text-xs text-gray-500">Terms of Service</span>
        <span className="text-xs text-gray-500">Privacy Policy</span>
        <span className="text-xs text-gray-500">Follow on Twitter</span>
        <Link
          className="text-xs underline-offset-4 hover:underline"
          href="https://github.com/willholmeswastaken/wub"
          target="_blank"
          rel="noreferrer"
        >
          Star us on Github
        </Link>
      </nav>
    </footer>
  );
}
