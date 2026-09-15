import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RecipeForm } from "@/components/recipes/recipe-form";
import { DeleteRecipeButton } from "@/components/recipes/delete-recipe-button";
import { PageShell, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Recipes" };

export default async function RecipesPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/host/classes/${params.id}/recipes`);
  const { data: profile } = await supabase.from("chef_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/host/new");
  const { data: klass } = await supabase.from("classes").select("id, title, chef_profile_id").eq("id", params.id).maybeSingle();
  if (!klass || klass.chef_profile_id !== profile.id) notFound();

  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, name, base_servings, recipe_ingredients(id)")
    .eq("class_id", klass.id)
    .order("position", { ascending: true });

  const list = recipes ?? [];

  return (
    <PageShell>
      <Link href={`/host/classes/${klass.id}`} className="text-sm text-walnut hover:text-iron">
        ← {klass.title}
      </Link>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Recipes</h1>
      <p className="mt-2 text-walnut">
        Add the recipes you teach in this class. Each session gets a prep sheet that scales these to how many people booked.
      </p>

      <section className="mt-8">
        {list.length === 0 ? (
          <EmptyState title="No recipes yet">Add your first recipe below, then open any session to see its prep sheet.</EmptyState>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {list.map((r) => {
              const count = Array.isArray(r.recipe_ingredients) ? r.recipe_ingredients.length : 0;
              return (
                <li key={r.id} className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-sm text-walnut">
                      makes {r.base_servings} · {count} ingredient{count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Link href={`/host/classes/${klass.id}/recipes/${r.id}`} className="text-sm text-walnut transition-colors hover:text-iron">
                      Edit
                    </Link>
                    <DeleteRecipeButton classId={klass.id} recipeId={r.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl">Add a recipe</h2>
        <div className="mt-4">
          <RecipeForm classId={klass.id} />
        </div>
      </section>
    </PageShell>
  );
}
