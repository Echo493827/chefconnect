import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MessageComposer } from "@/components/messages/message-composer";
import { sendDmMessage, markDmRead } from "@/lib/messages/dm-actions";
import { PageShell } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Direct message" };

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function DmThreadPage({ params }: { params: { threadId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/messages/dm/${params.threadId}`);

  const { data: thread } = await supabase
    .from("dm_threads")
    .select("id, user_lo, user_hi, lo:users!dm_threads_user_lo_fkey(display_name), hi:users!dm_threads_user_hi_fkey(display_name)")
    .eq("id", params.threadId)
    .maybeSingle();
  if (!thread) notFound();

  const { data: messages } = await supabase
    .from("dm_messages")
    .select("id, sender_id, body, created_at")
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true });

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
  const iAmLo = thread.user_lo === user.id;
  const other = (iAmLo ? one(thread.hi) : one(thread.lo))?.display_name ?? "Friend";

  await markDmRead(thread.id);

  return (
    <PageShell>
      <Link href="/messages" className="text-sm text-walnut hover:text-iron">
        ← All messages
      </Link>
      <h1 className="mt-3 font-display text-3xl tracking-tight">{other}</h1>

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

      <MessageComposer action={sendDmMessage.bind(null, thread.id)} />
    </PageShell>
  );
}
