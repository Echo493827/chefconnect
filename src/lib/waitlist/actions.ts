"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type SeatType = Database["public"]["Enums"]["seat_type"];

export async function joinWaitlist(sessionId: string, seatType: SeatType): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/book/${sessionId}`);
  await supabase.rpc("join_waitlist", { p_session_id: sessionId, p_seat_type: seatType });
  revalidatePath(`/book/${sessionId}`);
}

export async function leaveWaitlist(sessionId: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("waitlist_entries").delete().eq("session_id", sessionId).eq("user_id", user.id);
  revalidatePath(`/book/${sessionId}`);
}
