import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { RespondButtons, RemoveButton } from "@/components/friends/friend-buttons";
import { FindPeople } from "@/components/friends/find-people";
import { ActivityFeed } from "@/components/friends/activity-feed";
import { PageShell, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Friends" };

export default async function FriendsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/friends");

  const { data: rows } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status, requester:users!friendships_requester_id_fkey(display_name), addressee:users!friendships_addressee_id_fkey(display_name)")
    .order("updated_at", { ascending: false });

  const { data: activity } = await supabase.rpc("friend_activity", { p_limit: 30 });
  const feed = activity ?? [];

  const all = rows ?? [];
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  const friends = all
    .filter((r) => r.status === "accepted")
    .map((r) => {
      const iAmRequester = r.requester_id === user.id;
      const other = one(iAmRequester ? r.addressee : r.requester);
      return { id: r.id, name: other?.display_name ?? "Someone", otherId: iAmRequester ? r.addressee_id : r.requester_id };
    });

  const incoming = all
    .filter((r) => r.status === "pending" && r.addressee_id === user.id)
    .map((r) => ({ id: r.id, name: one(r.requester)?.display_name ?? "Someone" }));

  const outgoing = all
    .filter((r) => r.status === "pending" && r.requester_id === user.id)
    .map((r) => ({ id: r.id, name: one(r.addressee)?.display_name ?? "Someone" }));

  // Exclude self, existing friends, and anyone with a pending request from search.
  const excludeIds = [user.id, ...friends.map((f) => f.otherId)];
  for (const r of all) {
    if (r.status === "pending") excludeIds.push(r.requester_id === user.id ? r.addressee_id : r.requester_id);
  }

  return (
    <PageShell>
      <h1 className="font-display text-4xl tracking-tight">Friends</h1>

      {feed.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-2xl">What your friends are up to</h2>
          <div className="mt-3">
            <ActivityFeed items={feed} />
          </div>
        </section>
      )}

      <div className="mt-12 border-t border-line pt-2" />

      {incoming.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-2xl">Requests</h2>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {incoming.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                <span className="text-iron">{r.name}</span>
                <RespondButtons friendshipId={r.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-display text-2xl">Your friends</h2>
        <div className="mt-3">
          {friends.length === 0 ? (
            <EmptyState title="No friends yet">Search for people below to send your first friend request.</EmptyState>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {friends.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="text-iron">{f.name}</span>
                  <RemoveButton friendshipId={f.id} label="Remove" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {outgoing.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-2xl">Sent requests</h2>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {outgoing.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                <span className="text-walnut">{r.name}</span>
                <RemoveButton friendshipId={r.id} label="Cancel" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 border-t border-line pt-8">
        <FindPeople excludeIds={excludeIds} />
      </section>
    </PageShell>
  );
}
