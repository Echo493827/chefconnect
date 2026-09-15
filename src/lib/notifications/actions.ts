"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/notifications");
  return { supabase, user };
}

export async function markNotificationRead(id: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  revalidatePath("/notifications");
  revalidatePath("/", "layout"); // refresh the header unread count
}

export async function markAllNotificationsRead(): Promise<void> {
  const { supabase, user } = await requireUser();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}
