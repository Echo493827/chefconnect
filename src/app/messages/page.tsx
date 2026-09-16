import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageShell, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Messages" };

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type Row = { href: string; title: string; subtitle: string; at: string | null; unread: boolean };

export default async function MessagesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/messages");
  const uid = user.id;
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  const { data: myChef } = await supabase.from("chef_profiles").select("id").eq("user_id", uid).maybeSingle();

  // Class Q&A threads
  const { data: classThreads } = await supabase
    .from("message_threads")
    .select("id, chef_profile_id, last_message_at, guest_last_read_at, chef_last_read_at, classes(title), users!message_threads_guest_id_fkey(display_name), chef_profiles(business_name)")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(100);

  // Friend DMs
  const { data: dmThreads } = await supabase
    .from("dm_threads")
    .select("id, user_lo, last_message_at, lo_last_read_at, hi_last_read_at, lo:users!dm_threads_user_lo_fkey(display_name), hi:users!dm_threads_user_hi_fkey(display_name)")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(100);

  const rows: Row[] = [];

  for (const t of classThreads ?? []) {
    if (!t.last_message_at) continue;
    const iAmChef = myChef?.id === t.chef_profile_id;
    const klass = one(t.classes);
    const guest = one(t.users);
    const chef = one(t.chef_profiles);
    const myRead = iAmChef ? t.chef_last_read_at : t.guest_last_read_at;
    rows.push({
      href: `/messages/${t.id}`,
      title: iAmChef ? guest?.display_name ?? "Guest" : chef?.business_name ?? "Chef",
      subtitle: `about ${klass?.title ?? "a class"}`,
      at: t.last_message_at,
      unread: Boolean(!myRead || new Date(t.last_message_at) > new Date(myRead)),
    });
  }

  for (const t of dmThreads ?? []) {
    if (!t.last_message_at) continue;
    const iAmLo = t.user_lo === uid;
    const other = (iAmLo ? one(t.hi) : one(t.lo))?.display_name ?? "Friend";
    const myRead = iAmLo ? t.lo_last_read_at : t.hi_last_read_at;
    rows.push({
      href: `/messages/dm/${t.id}`,
      title: other,
      subtitle: "Direct message",
      at: t.last_message_at,
      unread: Boolean(!myRead || new Date(t.last_message_at) > new Date(myRead)),
    });
  }

  rows.sort((a, b) => new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime());

  return (
    <PageShell>
      <h1 className="font-display text-4xl tracking-tight">Messages</h1>
      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState title="No messages yet">
            Ask a chef about a class, or message a friend, and the conversation shows up here.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {rows.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="flex items-start gap-3 py-4 transition-colors hover:bg-cream/60">
                  <span aria-hidden="true" className={`mt-2 h-2 w-2 shrink-0 rounded-full ${r.unread ? "bg-olive" : "bg-transparent"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className={r.unread ? "font-medium text-iron" : "text-iron"}>{r.title}</span>
                      <span className="shrink-0 text-xs text-walnut">{timeAgo(r.at)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-walnut">{r.subtitle}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
