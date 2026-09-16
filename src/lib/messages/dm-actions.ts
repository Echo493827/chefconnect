"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/messages/actions";

// Open (or reuse) a direct-message thread with a friend, then go to it.
export async function startDm(friendUserId: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/friends");
  const { data: threadId, error } = await supabase.rpc("start_dm", { p_friend: friendUserId });
  if (error || !threadId) redirect("/friends");
  redirect(`/messages/dm/${threadId}`);
}

export async function sendDmMessage(threadId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/messages/dm/${threadId}`);

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: null };
  if (body.length > 4000) return { error: "That message is too long (max 4000 characters)." };

  const { error } = await supabase.from("dm_messages").insert({ thread_id: threadId, sender_id: user.id, body });
  if (error) return { error: "Couldn't send your message. Please try again." };

  await markDmReadFor(threadId, user.id);
  revalidatePath(`/messages/dm/${threadId}`);
  revalidatePath("/messages");
  return { error: null };
}

async function markDmReadFor(threadId: string, userId: string) {
  const supabase = createClient();
  const { data: thread } = await supabase.from("dm_threads").select("user_lo").eq("id", threadId).maybeSingle();
  if (!thread) return;
  const patch: { lo_last_read_at?: string; hi_last_read_at?: string } = {};
  const now = new Date().toISOString();
  if (thread.user_lo === userId) patch.lo_last_read_at = now;
  else patch.hi_last_read_at = now;
  await supabase.from("dm_threads").update(patch).eq("id", threadId);
}

export async function markDmRead(threadId: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await markDmReadFor(threadId, user.id);
  revalidatePath("/messages");
  revalidatePath("/", "layout");
}
