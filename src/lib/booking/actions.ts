"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type SeatType = Database["public"]["Enums"]["seat_type"];

export type FormState = {
  error: string | null;
};

// Best-effort client IP from the proxy chain, for the waiver record.
function clientIp(): string | null {
  const h = headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return h.get("x-real-ip");
}

// Book a seat. book_session() records the waiver acceptance and the booking in a
// single transaction and claims the seat atomically, so overbooking is
// impossible and a booking can never exist without its waiver.
export async function createBooking(sessionId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/book/${sessionId}`);

  const seatType = String(formData.get("seat_type") ?? "") as SeatType;
  if (seatType !== "in_person" && seatType !== "virtual") {
    return { error: "Choose whether you're attending in person or online." };
  }
  if (formData.get("accept_waiver") !== "on") {
    return { error: "Please read and accept the waiver to book." };
  }
  const waiverVersion = String(formData.get("waiver_version") ?? "").trim();
  if (!waiverVersion) {
    return { error: "Something went out of date. Refresh the page and try again." };
  }

  const quantity = Math.max(1, Math.min(10, Math.trunc(Number(formData.get("quantity")) || 1)));
  const dietaryNotes = String(formData.get("dietary_notes") ?? "").trim();
  if (dietaryNotes.length > 1000) {
    return { error: "Please keep dietary notes under 1000 characters." };
  }

  const h = headers();
  const { error } = await supabase.rpc("book_session", {
    p_session_id: sessionId,
    p_seat_type: seatType,
    p_waiver_version: waiverVersion,
    p_ip_address: clientIp() ?? undefined,
    p_user_agent: h.get("user-agent")?.slice(0, 500) ?? undefined,
    p_quantity: quantity,
    p_dietary_notes: dietaryNotes || undefined,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (error.code === "23505" || msg.includes("duplicate")) {
      return { error: "You're already booked for this session." };
    }
    if (msg.includes("full")) {
      return { error: "This session just filled up. Try another date." };
    }
    if (msg.includes("no longer open") || msg.includes("past")) {
      return { error: "This session is no longer open for booking." };
    }
    if (msg.includes("out of date")) {
      return { error: "The waiver was updated. Refresh the page and accept the current one." };
    }
    if (msg.includes("own session")) {
      return { error: "You can't book your own class." };
    }
    if (msg.includes("does not offer")) {
      return { error: "That seat type isn't available for this session." };
    }
    return { error: "Couldn't complete the booking. Please try again in a moment." };
  }

  revalidatePath("/bookings");
  redirect("/bookings?booked=1");
}

// Cancel a booking. The database enforces the cutoff (and lets the chef cancel
// any time); the freed seat and any notifications are handled there too.
export async function cancelBooking(bookingId: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/bookings");
  await supabase.rpc("cancel_booking", { p_booking_id: bookingId });
  revalidatePath("/bookings");
}
