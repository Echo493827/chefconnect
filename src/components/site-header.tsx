import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Shown on every page. Resolves the signed-in state on the server; if
// Supabase is unreachable it quietly renders the signed-out header instead
// of taking the whole page down.
export async function SiteHeader() {
  let displayName: string | null = null;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      displayName = profile?.display_name ?? "Account";
    }
  } catch {
    // fall through to the signed-out header
  }

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
        <Link href="/" className="font-display text-xl tracking-tight">
          ChefConnect
        </Link>
        <nav className="flex items-center gap-5 text-sm" aria-label="Account">
          {displayName ? (
            <Link href="/account" className="max-w-[16rem] truncate transition-colors hover:text-walnut">
              {displayName}
            </Link>
          ) : (
            <>
              <Link href="/login" className="transition-colors hover:text-walnut">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded bg-olive px-3.5 py-1.5 font-medium text-cream transition-colors hover:bg-olive-deep"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
