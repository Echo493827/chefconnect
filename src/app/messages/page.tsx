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

export default async function MessagesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/messages");

  const { data: myChef } = await supabase.from("chef_profiles").select("id").eq("user_id", user.id).maybeSingle();

  // Threads where I'm the guest or (if I'm a chef) the chef.
  const { data: threads } = await supabase
    .from("message_threads")
    .select(
      "id, class_id, guest_id, chef_profile_id, last_message_at, guest_last_read_at, chef_last_read_at, classes(title, slug), users!message_threads_guest_id_fkey(display_name), chef_profiles(business_name, slug)",
    )
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(100);

  const list = (threads ?? []).filter((t) => t.last_message_at); // only threads with activity

  return (
    <PageShell>
      <h1 className="font-display text-4xl tracking-tight">Messages</h1>
      <div className="mt-6">
        {list.length === 0 ? (
          <EmptyState title="No messages yet">
            When you ask a chef a question about a class, the conversation shows up here.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {list.map((t) => {
              const iAmChef = myChef?.id === t.chef_profile_id;
              const klass = Array.isArray(t.classes) ? t.classes[0] : t.classes;
              const guest = Array.isArray(t.users) ? t.users[0] : t.users;
              const chef = Array.isArray(t.chef_profiles) ? t.chef_profiles[0] : t.chef_profiles;
              const other = iAmChef ? guest?.display_name ?? "Guest" : chef?.business_name ?? "Chef";
              const myRead = iAmChef ? t.chef_last_read_at : t.guest_last_read_at;
              const unread = Boolean(t.last_message_at && (!myRead || new Date(t.last_message_at) > new Date(myRead)));
              return (
                <li key={t.id}>
                  <Link href={`/messages/${t.id}`} className="flex items-start gap-3 py-4 transition-colors hover:bg-cream/60">
                    <span aria-hidden="true" className={`mt-2 h-2 w-2 shrink-0 rounded-full ${unread ? "bg-olive" : "bg-transparent"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className={unread ? "font-medium text-iron" : "text-iron"}>{other}</span>
                        <span className="shrink-0 text-xs text-walnut">{timeAgo(t.last_message_at)}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-walnut">about {klass?.title ?? "a class"}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
