import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MessageComposer } from "@/components/messages/message-composer";
import { markThreadRead } from "@/lib/messages/actions";
import { PageShell } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Conversation" };

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function ThreadPage({ params }: { params: { threadId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/messages/${params.threadId}`);

  // RLS returns the thread only to its participants.
  const { data: thread } = await supabase
    .from("message_threads")
    .select("id, class_id, guest_id, chef_profile_id, classes(title, slug), users!message_threads_guest_id_fkey(display_name), chef_profiles(business_name, slug)")
    .eq("id", params.threadId)
    .maybeSingle();
  if (!thread) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true });

  const klass = Array.isArray(thread.classes) ? thread.classes[0] : thread.classes;
  const guest = Array.isArray(thread.users) ? thread.users[0] : thread.users;
  const chef = Array.isArray(thread.chef_profiles) ? thread.chef_profiles[0] : thread.chef_profiles;
  const iAmGuest = thread.guest_id === user.id;
  const other = iAmGuest ? chef?.business_name ?? "Chef" : guest?.display_name ?? "Guest";

  // Mark as read now that they're viewing it.
  await markThreadRead(thread.id);

  return (
    <PageShell>
      <Link href="/messages" className="text-sm text-walnut hover:text-iron">
        ← All messages
      </Link>
      <div className="mt-3">
        <h1 className="font-display text-3xl tracking-tight">{other}</h1>
        <p className="mt-1 text-sm text-walnut">
          About{" "}
          {klass && chef ? (
            <Link href={`/chefs/${chef.slug}/${klass.slug}`} className="underline decoration-line underline-offset-2 hover:decoration-walnut">
              {klass.title}
            </Link>
          ) : (
            "a class"
          )}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {(messages ?? []).length === 0 ? (
          <p className="text-walnut">No messages yet. Say hello.</p>
        ) : (
          (messages ?? []).map((m) => {
            const mine = m.sender_id === user.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-3.5 py-2.5 ${mine ? "bg-olive text-cream" : "border border-line bg-cream text-iron"}`}>
                  <p className="whitespace-pre-line text-sm leading-relaxed">{m.body}</p>
                  <p className={`mt-1 text-[11px] ${mine ? "text-cream/70" : "text-walnut"}`}>{formatTime(m.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <MessageComposer threadId={thread.id} />
    </PageShell>
  );
}
