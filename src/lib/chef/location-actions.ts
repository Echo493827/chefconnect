"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/geocode";

export type FormState = {
  error: string | null;
  message: string | null;
};

async function requireChef() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/host/locations");
  const { data: profile } = await supabase.from("chef_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/host/new");
  return { supabase, chefProfileId: profile.id };
}

// Create or update a location. The chef gives a normal address; we geocode it to
// a point, then upsert_location() writes the public half (which a trigger fuzzes)
// and the private half (exact address, RLS-guarded) together in one transaction.
export async function saveLocation(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireChef();

  const locationId = String(formData.get("location_id") ?? "").trim() || null;
  const label = String(formData.get("label") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const neighborhood = String(formData.get("neighborhood") ?? "").trim();
  const fullAddress = String(formData.get("full_address") ?? "").trim();
  const arrivalNotes = String(formData.get("arrival_notes") ?? "").trim();

  if (label.length < 1 || label.length > 80) {
    return { error: "Give this location a short label, like “My home kitchen”.", message: null };
  }
  if (!fullAddress) {
    return { error: "Enter the full street address so we can place it on the map.", message: null };
  }

  const geo = await geocodeAddress(fullAddress);
  if (!geo) {
    return {
      error: "We couldn't find that address. Check the street, city, and postal code, then try again.",
      message: null,
    };
  }

  // Prefer the city the chef typed; fall back to nothing rather than guessing.
  if (!city) {
    return { error: "Add the city for this location.", message: null };
  }

  const { error } = await supabase.rpc("upsert_location", {
    p_label: label,
    p_city: city,
    p_full_address: fullAddress,
    p_exact_lat: geo.lat,
    p_exact_lng: geo.lng,
    p_location_id: locationId ?? undefined,
    p_region: region || undefined,
    p_neighborhood: neighborhood || undefined,
    p_arrival_notes: arrivalNotes || undefined,
  });

  if (error) {
    return { error: "Couldn't save this location. Try again in a moment.", message: null };
  }

  revalidatePath("/host/locations");
  redirect("/host/locations");
}

export async function deleteLocation(locationId: string): Promise<void> {
  const { supabase } = await requireChef();
  // RLS limits deletes to the owning chef. Sessions reference locations with
  // ON DELETE RESTRICT, so a location in use can't be removed by accident.
  await supabase.from("locations").delete().eq("id", locationId);
  revalidatePath("/host/locations");
}
