"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uniqueSlug } from "@/lib/slug";
import type { Database } from "@/lib/database.types";

type ChefType = Database["public"]["Enums"]["chef_type"];
type SkillLevel = Database["public"]["Enums"]["skill_level"];

export type FormState = {
  error: string | null;
  message: string | null;
};

const CHEF_TYPES: ChefType[] = ["home", "restaurant", "youtube", "celebrity", "cooking_school", "other"];
const SKILL_LEVELS: SkillLevel[] = ["beginner", "intermediate", "advanced", "all_levels"];

// Split a comma- or newline-separated field into a clean, de-duplicated list.
function toList(raw: FormDataEntryValue | null, max = 20): string[] {
  if (!raw) return [];
  const items = String(raw)
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(items)).slice(0, max);
}

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/host");
  return { supabase, user };
}

// Create the caller's chef profile. The DB trigger promotes their role to chef.
export async function createChefProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();

  const chefType = String(formData.get("chef_type") ?? "") as ChefType;
  const businessName = String(formData.get("business_name") ?? "").trim();
  const headline = String(formData.get("headline") ?? "").trim();
  const about = String(formData.get("about") ?? "").trim();
  const specialties = toList(formData.get("specialties"));
  const website = String(formData.get("website") ?? "").trim();
  const instagram = String(formData.get("instagram") ?? "").trim();
  const youtube = String(formData.get("youtube") ?? "").trim();

  if (!CHEF_TYPES.includes(chefType)) {
    return { error: "Choose what kind of chef you are.", message: null };
  }
  if (headline.length > 140) {
    return { error: "Keep your headline under 140 characters.", message: null };
  }

  // A profile already exists? Send them to the dashboard rather than erroring.
  const existing = await supabase.from("chef_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (existing.data) redirect("/host");

  const displayName = (user.user_metadata?.display_name as string | undefined)?.trim();
  const slugSource = businessName || displayName || "chef";
  const slug = await uniqueSlug(
    slugSource,
    async (candidate) => {
      const { data } = await supabase.from("chef_profiles").select("id").eq("slug", candidate).maybeSingle();
      return Boolean(data);
    },
    "chef",
  );

  const socialLinks: Record<string, string> = {};
  if (website) socialLinks.website = website;
  if (instagram) socialLinks.instagram = instagram;
  if (youtube) socialLinks.youtube = youtube;

  const { error } = await supabase.from("chef_profiles").insert({
    user_id: user.id,
    slug,
    chef_type: chefType,
    business_name: businessName || null,
    headline: headline || null,
    about: about || null,
    specialties,
    social_links: socialLinks,
    cover_image_url: String(formData.get("cover_image_url") ?? "").trim() || null,
  });

  if (error) {
    return { error: "Couldn't create your chef profile. Try again in a moment.", message: null };
  }

  revalidatePath("/", "layout");
  redirect("/host");
}

// Update the caller's existing chef profile. RLS guarantees they can only touch
// their own row.
export async function updateChefProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();

  const chefType = String(formData.get("chef_type") ?? "") as ChefType;
  const businessName = String(formData.get("business_name") ?? "").trim();
  const headline = String(formData.get("headline") ?? "").trim();
  const about = String(formData.get("about") ?? "").trim();
  const specialties = toList(formData.get("specialties"));
  const website = String(formData.get("website") ?? "").trim();
  const instagram = String(formData.get("instagram") ?? "").trim();
  const youtube = String(formData.get("youtube") ?? "").trim();
  const acceptingBookings = formData.get("is_accepting_bookings") === "on";

  if (!CHEF_TYPES.includes(chefType)) {
    return { error: "Choose what kind of chef you are.", message: null };
  }
  if (headline.length > 140) {
    return { error: "Keep your headline under 140 characters.", message: null };
  }

  const socialLinks: Record<string, string> = {};
  if (website) socialLinks.website = website;
  if (instagram) socialLinks.instagram = instagram;
  if (youtube) socialLinks.youtube = youtube;

  const { error } = await supabase
    .from("chef_profiles")
    .update({
      chef_type: chefType,
      business_name: businessName || null,
      headline: headline || null,
      about: about || null,
      specialties,
      social_links: socialLinks,
      cover_image_url: String(formData.get("cover_image_url") ?? "").trim() || null,
      is_accepting_bookings: acceptingBookings,
    })
    .eq("user_id", user.id);

  if (error) {
    return { error: "Couldn't save your changes. Try again in a moment.", message: null };
  }

  revalidatePath("/", "layout");
  return { error: null, message: "Saved." };
}

async function currentChefProfileId(): Promise<{ supabase: ReturnType<typeof createClient>; chefProfileId: string }> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("chef_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!data) redirect("/host/new");
  return { supabase, chefProfileId: data.id };
}

function readClassFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const cuisine = String(formData.get("cuisine") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const skillLevel = String(formData.get("skill_level") ?? "all_levels") as SkillLevel;
  const durationRaw = Number(formData.get("duration_minutes"));
  const tags = toList(formData.get("tags"));
  const dietaryTags = toList(formData.get("dietary_tags"));
  const whatYouLearn = toList(formData.get("what_you_learn"), 30);
  const whatToBring = toList(formData.get("what_to_bring"), 30);
  const coverImageUrl = String(formData.get("cover_image_url") ?? "").trim();
  const galleryUrls = formData.getAll("gallery_urls").map((v) => String(v).trim()).filter(Boolean).slice(0, 8);
  return { title, cuisine, summary, description, skillLevel, durationRaw, tags, dietaryTags, whatYouLearn, whatToBring, coverImageUrl, galleryUrls };
}

function validateClass(f: ReturnType<typeof readClassFields>): string | null {
  if (f.title.length < 3 || f.title.length > 120) return "Give your class a title between 3 and 120 characters.";
  if (!f.cuisine) return "Add a cuisine — it's how people find your class.";
  if (!SKILL_LEVELS.includes(f.skillLevel)) return "Pick a skill level.";
  if (!Number.isFinite(f.durationRaw) || f.durationRaw < 15 || f.durationRaw > 720) {
    return "Set a duration between 15 and 720 minutes.";
  }
  if (f.summary.length > 280) return "Keep the short summary under 280 characters.";
  return null;
}

// Create a class as a draft and go straight to its editor to keep filling it in.
export async function createClass(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, chefProfileId } = await currentChefProfileId();
  const f = readClassFields(formData);
  const problem = validateClass(f);
  if (problem) return { error: problem, message: null };

  const slug = await uniqueSlug(
    f.title,
    async (candidate) => {
      const { data } = await supabase
        .from("classes")
        .select("id")
        .eq("chef_profile_id", chefProfileId)
        .eq("slug", candidate)
        .maybeSingle();
      return Boolean(data);
    },
    "class",
  );

  const { data, error } = await supabase
    .from("classes")
    .insert({
      chef_profile_id: chefProfileId,
      slug,
      title: f.title,
      cuisine: f.cuisine,
      summary: f.summary || null,
      description: f.description || null,
      skill_level: f.skillLevel,
      duration_minutes: f.durationRaw,
      tags: f.tags,
      dietary_tags: f.dietaryTags,
      what_you_learn: f.whatYouLearn,
      what_to_bring: f.whatToBring,
      cover_image_url: f.coverImageUrl || null,
      gallery_urls: f.galleryUrls,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Couldn't create the class. Try again in a moment.", message: null };
  }

  revalidatePath("/host");
  redirect(`/host/classes/${data.id}`);
}

export async function updateClass(classId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await currentChefProfileId();
  const f = readClassFields(formData);
  const problem = validateClass(f);
  if (problem) return { error: problem, message: null };

  const { error } = await supabase
    .from("classes")
    .update({
      title: f.title,
      cuisine: f.cuisine,
      summary: f.summary || null,
      description: f.description || null,
      skill_level: f.skillLevel,
      duration_minutes: f.durationRaw,
      tags: f.tags,
      dietary_tags: f.dietaryTags,
      what_you_learn: f.whatYouLearn,
      what_to_bring: f.whatToBring,
      cover_image_url: f.coverImageUrl || null,
      gallery_urls: f.galleryUrls,
    })
    .eq("id", classId);

  if (error) {
    return { error: "Couldn't save the class. Try again in a moment.", message: null };
  }

  revalidatePath(`/host/classes/${classId}`);
  revalidatePath("/host");
  return { error: null, message: "Saved." };
}

// Publish / unpublish / archive are the chef's own controls, not a review gate.
// RLS ensures they can only change the status of a class they own.
async function setOwnClassStatus(classId: string, status: Database["public"]["Enums"]["class_status"]) {
  const { supabase } = await currentChefProfileId();
  const { error } = await supabase.from("classes").update({ status }).eq("id", classId);
  revalidatePath(`/host/classes/${classId}`);
  revalidatePath("/host");
  return error;
}

export async function publishClass(classId: string): Promise<void> {
  await setOwnClassStatus(classId, "published");
}

export async function unpublishClass(classId: string): Promise<void> {
  await setOwnClassStatus(classId, "draft");
}

export async function archiveClass(classId: string): Promise<void> {
  await setOwnClassStatus(classId, "archived");
}
