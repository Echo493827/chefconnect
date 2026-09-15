"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = {
  error: string | null;
  message: string | null;
};

function readRating(formData: FormData): number | null {
  const n = Math.trunc(Number(formData.get("rating")));
  return n >= 1 && n <= 5 ? n : null;
}

// Submit a review for a booking. The database trigger is the real gatekeeper:
// it confirms the caller attended, that the session has ended, and fills the
// class/chef from the booking so they can't be spoofed. We just pass what we know.
export async function submitReview(bookingId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/review/${bookingId}`);

  const rating = readRating(formData);
  if (!rating) return { error: "Choose a rating from 1 to 5 stars.", message: null };
  const body = String(formData.get("body") ?? "").trim();
  if (body.length > 3000) return { error: "Please keep your review under 3000 characters.", message: null };

  // Look up the booking's session/class/chef to satisfy the not-null columns;
  // the trigger re-derives and validates these regardless.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, session_id, sessions(class_id, classes(chef_profile_id))")
    .eq("id", bookingId)
    .maybeSingle();
  const session = booking && (Array.isArray(booking.sessions) ? booking.sessions[0] : booking.sessions);
  const klass = session && (Array.isArray(session.classes) ? session.classes[0] : session.classes);
  if (!booking || !session || !klass) {
    return { error: "We couldn't find that booking.", message: null };
  }

  const { error } = await supabase.from("reviews").insert({
    booking_id: booking.id,
    session_id: booking.session_id,
    class_id: session.class_id,
    chef_profile_id: klass.chef_profile_id,
    user_id: user.id,
    rating,
    body: body || null,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (error.code === "23505" || msg.includes("duplicate")) {
      return { error: "You've already reviewed this class. You can edit your review instead.", message: null };
    }
    if (msg.includes("ended") || msg.includes("open")) {
      return { error: "You can review this class once the session has finished.", message: null };
    }
    if (msg.includes("attended") || msg.includes("only review")) {
      return { error: "Only people who attended can review a class.", message: null };
    }
    return { error: "Couldn't post your review. Please try again in a moment.", message: null };
  }

  revalidatePath("/bookings");
  redirect("/bookings?reviewed=1");
}

// Edit your own review. RLS + trigger let the author change only rating and body.
export async function updateReview(reviewId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/bookings");

  const rating = readRating(formData);
  if (!rating) return { error: "Choose a rating from 1 to 5 stars.", message: null };
  const body = String(formData.get("body") ?? "").trim();
  if (body.length > 3000) return { error: "Please keep your review under 3000 characters.", message: null };

  const { error } = await supabase.from("reviews").update({ rating, body: body || null }).eq("id", reviewId);
  if (error) return { error: "Couldn't save your changes. Please try again.", message: null };

  revalidatePath("/bookings");
  redirect("/bookings?reviewed=1");
}

// Chef responds to a review of one of their classes. The trigger allows the chef
// to set only the response (not the rating or body) and stamps the time.
export async function respondToReview(reviewId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/host/reviews");

  const response = String(formData.get("chef_response") ?? "").trim();
  if (response.length > 2000) return { error: "Please keep your response under 2000 characters.", message: null };

  const { error } = await supabase
    .from("reviews")
    .update({ chef_response: response || null })
    .eq("id", reviewId);
  if (error) return { error: "Couldn't save your response. Please try again.", message: null };

  revalidatePath("/host/reviews");
  return { error: null, message: "Response posted." };
}
