"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type SessionFormat = Database["public"]["Enums"]["session_format"];

export type FormState = {
  error: string | null;
  message: string | null;
};

const FORMATS: SessionFormat[] = ["in_person", "virtual", "hybrid"];

async function requireChefForClass(classId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/host/classes/${classId}`);
  const { data: profile } = await supabase.from("chef_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/host/new");
  // confirm the chef owns this class and grab its duration to derive end time
  const { data: klass } = await supabase
    .from("classes")
    .select("id, chef_profile_id, duration_minutes")
    .eq("id", classId)
    .maybeSingle();
  if (!klass || klass.chef_profile_id !== profile.id) redirect("/host");
  return { supabase, chefProfileId: profile.id, durationMinutes: klass.duration_minutes };
}

type ParsedSession = {
  format: SessionFormat;
  startsAtIso: string;
  locationId: string | null;
  inpersonCapacity: number;
  virtualCapacity: number;
  cutoffHours: number;
  joinUrl: string;
};

function parseSession(formData: FormData): ParsedSession | string {
  const format = String(formData.get("format") ?? "") as SessionFormat;
  if (!FORMATS.includes(format)) return "Choose a format for this session.";

  const startsAtIso = String(formData.get("starts_at_iso") ?? "").trim();
  const startMs = Date.parse(startsAtIso);
  if (!startsAtIso || Number.isNaN(startMs)) return "Pick a date and time for this session.";
  if (startMs <= Date.now()) return "Pick a date and time in the future.";

  const locationId = String(formData.get("location_id") ?? "").trim() || null;
  const inpersonCapacity = Math.trunc(Number(formData.get("inperson_capacity") ?? 0));
  const virtualCapacity = Math.trunc(Number(formData.get("virtual_capacity") ?? 0));
  const cutoffHours = Math.trunc(Number(formData.get("cancellation_cutoff_hours") ?? 24));
  const joinUrl = String(formData.get("virtual_join_url") ?? "").trim();

  const needsLocation = format === "in_person" || format === "hybrid";
  const needsVirtual = format === "virtual" || format === "hybrid";

  if (needsLocation && !locationId) return "Choose where this in-person session happens.";
  if (needsLocation && !(inpersonCapacity > 0)) return "Set how many in-person seats are available.";
  if (needsVirtual && !(virtualCapacity > 0)) return "Set how many virtual seats are available.";
  if (format === "virtual" && locationId) return "Virtual sessions don't have a location.";
  if (inpersonCapacity < 0 || inpersonCapacity > 500) return "In-person seats must be between 0 and 500.";
  if (virtualCapacity < 0 || virtualCapacity > 5000) return "Virtual seats must be between 0 and 5000.";
  if (cutoffHours < 0 || cutoffHours > 720) return "Cancellation cutoff must be between 0 and 720 hours.";

  return {
    format,
    startsAtIso,
    locationId: needsLocation ? locationId : null,
    inpersonCapacity: needsLocation ? inpersonCapacity : 0,
    virtualCapacity: needsVirtual ? virtualCapacity : 0,
    cutoffHours,
    joinUrl: needsVirtual ? joinUrl : "",
  };
}

// Save the join link (or clear it) for virtual/hybrid sessions. Only attendees
// with a live booking can read it (RLS on session_secrets).
async function upsertJoinUrl(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  joinUrl: string,
) {
  if (joinUrl) {
    await supabase.from("session_secrets").upsert({ session_id: sessionId, virtual_join_url: joinUrl });
  } else {
    await supabase.from("session_secrets").delete().eq("session_id", sessionId);
  }
}

export async function createSession(classId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, durationMinutes } = await requireChefForClass(classId);
  const parsed = parseSession(formData);
  if (typeof parsed === "string") return { error: parsed, message: null };

  const endsAtIso = new Date(Date.parse(parsed.startsAtIso) + durationMinutes * 60_000).toISOString();
  const timezone = String(formData.get("timezone") ?? "").trim() || "America/Chicago";

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      class_id: classId,
      location_id: parsed.locationId,
      format: parsed.format,
      starts_at: parsed.startsAtIso,
      ends_at: endsAtIso,
      timezone,
      inperson_capacity: parsed.inpersonCapacity,
      virtual_capacity: parsed.virtualCapacity,
      cancellation_cutoff_hours: parsed.cutoffHours,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Couldn't schedule this session. Check the details and try again.", message: null };
  }

  if (parsed.joinUrl) await upsertJoinUrl(supabase, data.id, parsed.joinUrl);

  revalidatePath(`/host/classes/${classId}`);
  redirect(`/host/classes/${classId}`);
}

export async function updateSession(
  classId: string,
  sessionId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, durationMinutes } = await requireChefForClass(classId);
  const parsed = parseSession(formData);
  if (typeof parsed === "string") return { error: parsed, message: null };

  const endsAtIso = new Date(Date.parse(parsed.startsAtIso) + durationMinutes * 60_000).toISOString();
  const timezone = String(formData.get("timezone") ?? "").trim() || "America/Chicago";

  const { error } = await supabase
    .from("sessions")
    .update({
      location_id: parsed.locationId,
      format: parsed.format,
      starts_at: parsed.startsAtIso,
      ends_at: endsAtIso,
      timezone,
      inperson_capacity: parsed.inpersonCapacity,
      virtual_capacity: parsed.virtualCapacity,
      cancellation_cutoff_hours: parsed.cutoffHours,
    })
    .eq("id", sessionId);

  if (error) {
    return { error: "Couldn't save the session. If people have already booked, capacity can't drop below that.", message: null };
  }

  await upsertJoinUrl(supabase, sessionId, parsed.joinUrl);

  revalidatePath(`/host/classes/${classId}`);
  return { error: null, message: "Saved." };
}

// Cancelling flips status; the database cascade cancels every live booking,
// frees the seats, and notifies each attendee (built and tested in Phase 0).
export async function cancelSession(classId: string, sessionId: string, formData: FormData): Promise<void> {
  const { supabase } = await requireChefForClass(classId);
  const reason = String(formData.get("cancellation_reason") ?? "").trim();
  await supabase
    .from("sessions")
    .update({ status: "cancelled", cancellation_reason: reason || null })
    .eq("id", sessionId);
  revalidatePath(`/host/classes/${classId}`);
}
