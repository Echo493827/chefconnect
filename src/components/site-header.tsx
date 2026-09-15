import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Shown on every page. Resolves the signed-in state and role on the server; if
// Supabase is unreachable it quietly renders the signed-out header instead of
// taking the whole page down.
export async function SiteHeader() {
  let displayName: string | null = null;
  let role: string | null = null;
  let isChef = false;
  let unreadCount = 0;

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
      const { count } = await supabase
        .from("notifications")
        .select("id", { head: true, count: "exact" })
        .is("read_at", null);
      unreadCount = count ?? 0;
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
              <Link href="/" className="text-walnut transition-colors hover:text-iron">
                Browse
              </Link>
              <Link href="/trending" className="text-walnut transition-colors hover:text-iron">
                Trending
              </Link>
              {role === "admin" && (
                <Link href="/admin" className="text-walnut transition-colors hover:text-iron">
                  Moderation
                </Link>
              )}
              <Link href="/bookings" className="text-walnut transition-colors hover:text-iron">
                My bookings
              </Link>
              <Link href="/messages" className="text-walnut transition-colors hover:text-iron">
                Messages
              </Link>
              <Link href="/friends" className="text-walnut transition-colors hover:text-iron">
                Friends
              </Link>
              <Link href={isChef ? "/host" : "/host/new"} className="text-walnut transition-colors hover:text-iron">
                {isChef ? "Chef dashboard" : "Teach a class"}
              </Link>
              <Link
                href="/notifications"
                aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
                className="relative text-walnut transition-colors hover:text-iron"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-paprika px-1 text-[10px] font-medium text-cream">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <Link href="/account" className="max-w-[16rem] truncate transition-colors hover:text-walnut">
                {displayName}
              </Link>
            </>
          ) : (
            <>
              <Link href="/" className="text-walnut transition-colors hover:text-iron">
                Browse
              </Link>
              <Link href="/trending" className="text-walnut transition-colors hover:text-iron">
                Trending
              </Link>
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
