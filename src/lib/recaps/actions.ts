"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = {
  error: string | null;
  message: string | null;
};

type Attachment = { label: string; url: string };

// Parse the attachments hidden field (a JSON array of {label,url}) defensively.
function parseAttachments(raw: FormDataEntryValue | null): Attachment[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((a) => ({ label: String(a?.label ?? "").trim(), url: String(a?.url ?? "").trim() }))
      .filter((a) => a.label && /^https?:\/\//.test(a.url))
      .slice(0, 10);
  } catch {
    return [];
  }
}

async function requireChefForSession(sessionId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/host");
  const { data: profile } = await supabase.from("chef_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/host/new");
  // confirm this chef owns the session (validate_recap enforces it too)
  const { data: session } = await supabase
    .from("sessions")
    .select("id, class_id, classes(chef_profile_id)")
    .eq("id", sessionId)
    .maybeSingle();
  const klass = session && (Array.isArray(session.classes) ? session.classes[0] : session.classes);
  if (!session || !klass || klass.chef_profile_id !== profile.id) redirect("/host");
  return { supabase, chefProfileId: profile.id, classId: session.class_id };
}

// Create or update the recap for a session (one per session). A checkbox controls
// whether it's visible to attendees; we set published_at the first time it's
// turned on and clear it when turned off.
export async function saveRecap(sessionId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, chefProfileId, classId } = await requireChefForSession(sessionId);

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const photoUrls = formData.getAll("photo_urls").map((v) => String(v).trim()).filter(Boolean).slice(0, 12);
  const attachments = parseAttachments(formData.get("attachments"));
  const publish = formData.get("publish") === "on";

  if (title.length < 1 || title.length > 120) {
    return { error: "Give your recap a title (up to 120 characters).", message: null };
  }
  if (body.length > 20000) {
    return { error: "That recap is a bit long — please keep it under 20,000 characters.", message: null };
  }

  // Preserve an existing publish time; only stamp it when first publishing.
  const { data: existing } = await supabase
    .from("recaps")
    .select("id, published_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  const published_at = publish ? existing?.published_at ?? new Date().toISOString() : null;

  const { error } = await supabase.from("recaps").upsert(
    {
      session_id: sessionId,
      chef_profile_id: chefProfileId,
      title,
      body: body || null,
      photo_urls: photoUrls,
      attachments,
      published_at,
    },
    { onConflict: "session_id" },
  );

  if (error) {
    return { error: "Couldn't save the recap. Please try again in a moment.", message: null };
  }

  revalidatePath(`/host/classes/${classId}`);
  redirect(`/host/classes/${classId}`);
}

export async function deleteRecap(sessionId: string): Promise<void> {
  const { supabase, classId } = await requireChefForSession(sessionId);
  await supabase.from("recaps").delete().eq("session_id", sessionId);
  revalidatePath(`/host/classes/${classId}`);
  redirect(`/host/classes/${classId}`);
}
