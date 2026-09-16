import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PrepSheet } from "@/components/recipes/prep-sheet";
import { PageShell, EmptyState } from "@/components/ui";
import { formatSessionDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Prep sheet" };

export default async function PrepSheetPage({ params }: { params: { id: string; sessionId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/host/classes/${params.id}/sessions/${params.sessionId}/prep`);
  const { data: profile } = await supabase.from("chef_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/host/new");

  const { data: klass } = await supabase.from("classes").select("id, title, chef_profile_id").eq("id", params.id).maybeSingle();
  if (!klass || klass.chef_profile_id !== profile.id) notFound();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, class_id, starts_at, timezone, inperson_booked")
    .eq("id", params.sessionId)
    .maybeSingle();
  if (!session || session.class_id !== klass.id) notFound();

  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, name, base_servings, recipe_ingredients(name, quantity, unit, position)")
    .eq("class_id", klass.id)
    .order("position", { ascending: true });

  const { data: dietRows } = await supabase
    .from("bookings")
    .select("dietary_notes, quantity, users(display_name)")
    .eq("session_id", session.id)
    .eq("status", "confirmed")
    .not("dietary_notes", "is", null);
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
  const dietaryNotes = (dietRows ?? []).map((d) => ({
    name: one(d.users)?.display_name ?? "Guest",
    note: d.dietary_notes as string,
  }));

  const prepRecipes = (recipes ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    base_servings: r.base_servings,
    ingredients: (r.recipe_ingredients ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ name: i.name, quantity: Number(i.quantity), unit: i.unit })),
  }));

  return (
    <PageShell>
      <Link href={`/host/classes/${klass.id}`} className="text-sm text-walnut hover:text-iron">
        ← {klass.title}
      </Link>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Prep sheet</h1>
      <p className="mt-2 text-walnut">Session on {formatSessionDateTime(session.starts_at, session.timezone)}.</p>

      <div className="mt-8">
        {prepRecipes.length === 0 ? (
          <EmptyState title="No recipes to scale yet">
            Add recipes to this class first, and the prep sheet will scale them to your headcount here.
            <span className="mt-3 block">
              <Link href={`/host/classes/${klass.id}/recipes`} className="underline decoration-line underline-offset-2 hover:decoration-walnut">
                Add recipes →
              </Link>
            </span>
          </EmptyState>
        ) : (
          <>
            {dietaryNotes.length > 0 && (
              <div className="mb-6 rounded border border-turmeric/30 bg-turmeric/10 p-4">
                <h2 className="font-display text-lg">Dietary needs from guests</h2>
                <ul className="mt-2 space-y-1 text-sm text-iron">
                  {dietaryNotes.map((d, i) => (
                    <li key={i}>
                      <span className="font-medium">{d.name}:</span> {d.note}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <PrepSheet recipes={prepRecipes} defaultHeadcount={session.inperson_booked} />
          </>
        )}
      </div>
    </PageShell>
  );
}
