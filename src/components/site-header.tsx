import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Shown on every page. Resolves the signed-in state and role on the server; if
// Supabase is unreachable it quietly renders the signed-out header instead of
// taking the whole page down.
export async function SiteHeader() {
  let displayName: string | null = null;
  let role: string | null = null;
  let isChef = false;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("users").select("display_name, role").eq("id", user.id).maybeSingle();
      displayName = profile?.display_name ?? "Account";
      role = profile?.role ?? "attendee";
      const { data: chef } = await supabase.from("chef_profiles").select("id").eq("user_id", user.id).maybeSingle();
      isChef = Boolean(chef);
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
        <nav className="flex items-center gap-5 text-sm" aria-label="Main">
          {displayName ? (
            <>
              {role === "admin" && (
                <Link href="/admin" className="text-walnut transition-colors hover:text-iron">
                  Moderation
                </Link>
              )}
              <Link href="/bookings" className="text-walnut transition-colors hover:text-iron">
                My bookings
              </Link>
              <Link href={isChef ? "/host" : "/host/new"} className="text-walnut transition-colors hover:text-iron">
                {isChef ? "Chef dashboard" : "Teach a class"}
              </Link>
              <Link href="/account" className="max-w-[16rem] truncate transition-colors hover:text-walnut">
                {displayName}
              </Link>
            </>
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
