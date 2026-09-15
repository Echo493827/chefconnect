"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = {
  error: string | null;
  message: string | null;
};

type Ingredient = { name: string; quantity: number; unit: string | null };

function parseIngredients(raw: FormDataEntryValue | null): Ingredient[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((i) => ({
        name: String(i?.name ?? "").trim(),
        quantity: Math.max(0, Number(i?.quantity) || 0),
        unit: String(i?.unit ?? "").trim() || null,
      }))
      .filter((i) => i.name)
      .slice(0, 60);
  } catch {
    return [];
  }
}

async function requireChefForClass(classId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/host/classes/${classId}/recipes`);
  const { data: profile } = await supabase.from("chef_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/host/new");
  const { data: klass } = await supabase.from("classes").select("id, chef_profile_id").eq("id", classId).maybeSingle();
  if (!klass || klass.chef_profile_id !== profile.id) redirect("/host");
  return { supabase, classId };
}

// Create or update a recipe (with its full ingredient list) via the atomic RPC.
export async function saveRecipe(classId: string, recipeId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireChefForClass(classId);

  const name = String(formData.get("name") ?? "").trim();
  const baseServings = Math.trunc(Number(formData.get("base_servings")));
  const notes = String(formData.get("notes") ?? "").trim();
  const ingredients = parseIngredients(formData.get("ingredients"));

  if (name.length < 1 || name.length > 120) return { error: "Give the recipe a name.", message: null };
  if (!Number.isFinite(baseServings) || baseServings < 1 || baseServings > 100) {
    return { error: "Base servings must be between 1 and 100.", message: null };
  }
  if (ingredients.length === 0) return { error: "Add at least one ingredient.", message: null };

  const { error } = await supabase.rpc("save_recipe", {
    p_class_id: classId,
    p_name: name,
    p_base_servings: baseServings,
    p_ingredients: ingredients,
    p_recipe_id: recipeId ?? undefined,
    p_notes: notes || undefined,
  });

  if (error) return { error: "Couldn't save the recipe. Please try again in a moment.", message: null };

  revalidatePath(`/host/classes/${classId}/recipes`);
  redirect(`/host/classes/${classId}/recipes`);
}

export async function deleteRecipe(classId: string, recipeId: string): Promise<void> {
  const { supabase } = await requireChefForClass(classId);
  await supabase.from("recipes").delete().eq("id", recipeId);
  revalidatePath(`/host/classes/${classId}/recipes`);
}
