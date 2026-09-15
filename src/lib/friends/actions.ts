"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/friends");
  return { supabase, user };
}

export async function sendFriendRequest(targetUserId: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.rpc("send_friend_request", { p_target: targetUserId });
  revalidatePath("/friends");
}

export async function respondFriendRequest(friendshipId: string, accept: boolean): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.rpc("respond_friend_request", { p_friendship_id: friendshipId, p_accept: accept });
  revalidatePath("/friends");
  revalidatePath("/", "layout");
}

// Cancel an outgoing request or remove an existing friend (RLS lets a
// participant delete the row).
export async function removeFriendship(friendshipId: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("friendships").delete().eq("id", friendshipId);
  revalidatePath("/friends");
}
