"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error: string | null };

// Open (or reuse) the caller's thread with a class's chef, then go to it.
export async function startThread(classId: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/`);

  const { data: threadId, error } = await supabase.rpc("start_thread", { p_class_id: classId });
  if (error || !threadId) redirect("/"); // own class / unavailable -> just go home
  redirect(`/messages/${threadId}`);
}

// Send a message into a thread the caller participates in, then mark it read for
// the sender (so their own message doesn't show the thread as unread).
export async function sendMessage(threadId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/messages/${threadId}`);

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: null }; // ignore empty sends
  if (body.length > 4000) return { error: "That message is too long (max 4000 characters)." };

  const { error } = await supabase.from("messages").insert({ thread_id: threadId, sender_id: user.id, body });
  if (error) return { error: "Couldn't send your message. Please try again." };

  await markThreadReadFor(threadId, user.id);
  revalidatePath(`/messages/${threadId}`);
  revalidatePath("/messages");
  return { error: null };
}

// Update the caller's read timestamp on a thread (whichever side they are).
async function markThreadReadFor(threadId: string, userId: string) {
  const supabase = createClient();
  const { data: thread } = await supabase
    .from("message_threads")
    .select("guest_id")
    .eq("id", threadId)
    .maybeSingle();
  if (!thread) return;
  const patch: { guest_last_read_at?: string; chef_last_read_at?: string } = {};
  const now = new Date().toISOString();
  if (thread.guest_id === userId) patch.guest_last_read_at = now;
  else patch.chef_last_read_at = now;
  await supabase.from("message_threads").update(patch).eq("id", threadId);
}

export async function markThreadRead(threadId: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await markThreadReadFor(threadId, user.id);
  revalidatePath("/messages");
  revalidatePath("/", "layout");
}
