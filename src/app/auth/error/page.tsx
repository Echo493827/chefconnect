import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign-in link problem" };

export default function AuthErrorPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-6 pb-24 pt-16">
      <h1 className="font-display text-4xl tracking-tight">That link didn&apos;t work</h1>
      <p className="mt-3 leading-relaxed text-walnut">
        The sign-in link is invalid or has expired. These links only work once and for a short time. Sign in again to get a
        fresh one.
      </p>
      <Link
        href="/login"
        className="mt-8 inline-block rounded bg-olive px-4 py-2.5 font-medium text-cream transition-colors hover:bg-olive-deep"
      >
        Back to sign in
      </Link>
    </main>
  );
}
