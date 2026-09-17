import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

// Sitewide footer with the basics a public site needs.
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-8 text-sm text-walnut sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg text-iron">{SITE_NAME}</p>
          <p className="mt-0.5">Cooking classes taught by the people who cook.</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
          <Link href="/" className="transition-colors hover:text-iron">
            Browse
          </Link>
          <Link href="/trending" className="transition-colors hover:text-iron">
            Trending
          </Link>
          <Link href="/host/new" className="transition-colors hover:text-iron">
            Teach a class
          </Link>
          <Link href="/terms" className="transition-colors hover:text-iron">
            Terms
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-iron">
            Privacy
          </Link>
        </nav>
      </div>
      <div className="border-t border-line/60">
        <p className="mx-auto w-full max-w-5xl px-6 py-4 text-xs text-walnut/70">© {year} {SITE_NAME}</p>
      </div>
    </footer>
  );
}
