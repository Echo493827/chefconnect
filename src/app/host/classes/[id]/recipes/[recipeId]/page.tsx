import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RecipeForm } from "@/components/recipes/recipe-form";
import { PageShell } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit recipe" };

export default async function EditRecipePage({ params }: { params: { id: string; recipeId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/host/classes/${params.id}/recipes/${params.recipeId}`);
  const { data: profile } = await supabase.from("chef_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/host/new");
  const { data: klass } = await supabase.from("classes").select("id, title, chef_profile_id").eq("id", params.id).maybeSingle();
  if (!klass || klass.chef_profile_id !== profile.id) notFound();

  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, class_id, name, base_servings, notes, recipe_ingredients(name, quantity, unit, position)")
    .eq("id", params.recipeId)
    .maybeSingle();
  if (!recipe || recipe.class_id !== klass.id) notFound();

  const ingredients = (recipe.recipe_ingredients ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((i) => ({ name: i.name, quantity: String(i.quantity), unit: i.unit ?? "" }));

  return (
    <PageShell>
      <Link href={`/host/classes/${klass.id}/recipes`} className="text-sm text-walnut hover:text-iron">
        ← Recipes
      </Link>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Edit recipe</h1>
      <div className="mt-8">
        <RecipeForm
          classId={klass.id}
          recipeId={recipe.id}
          defaultName={recipe.name}
          defaultBaseServings={recipe.base_servings}
          defaultNotes={recipe.notes ?? undefined}
          defaultIngredients={ingredients}
        />
      </div>
    </PageShell>
  );
}
