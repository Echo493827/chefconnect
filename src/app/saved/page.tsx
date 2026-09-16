import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { SaveButton } from "@/components/saved/save-button";
import { PageShell, EmptyState } from "@/components/ui";
import { formatSessionDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Saved classes" };

export default async function SavedPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/saved");

  // Saved classes still visible to the public (published, chef not suspended).
  const { data: rows } = await supabase
    .from("saved_classes")
    .select("class_id, created_at, classes(slug, title, cuisine, cover_image_url, status, chef_profiles(slug, business_name, is_suspended))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
  const saved = (rows ?? [])
    .map((r) => {
      const c = one(r.classes);
      const chef = c ? one(c.chef_profiles) : null;
      if (!c || !chef || c.status !== "published" || chef.is_suspended) return null;
      return { classId: r.class_id, slug: c.slug, title: c.title, cuisine: c.cuisine, cover: c.cover_image_url, chefSlug: chef.slug, chefName: chef.business_name };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  // Next upcoming session per saved class, for a "next date" line.
  const ids = saved.map((c) => c.classId);
  const { data: sessions } = ids.length
    ? await supabase
        .from("sessions")
        .select("class_id, starts_at, timezone")
        .in("class_id", ids)
        .eq("status", "scheduled")
        .gt("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
    : { data: [] as { class_id: string; starts_at: string; timezone: string }[] };
  const nextByClass = new Map<string, { starts_at: string; timezone: string }>();
  for (const s of sessions ?? []) if (!nextByClass.has(s.class_id)) nextByClass.set(s.class_id, s);

  return (
    <PageShell>
      <h1 className="font-display text-4xl tracking-tight">Saved</h1>
      <div className="mt-6">
        {saved.length === 0 ? (
          <EmptyState title="Nothing saved yet">
            Tap the heart on a class to save it here for later.{" "}
            <Link href="/" className="underline decoration-line underline-offset-2 hover:decoration-walnut">
              Browse classes
            </Link>
            .
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {saved.map((c) => {
              const next = nextByClass.get(c.classId);
              return (
                <li key={c.classId} className="flex items-center gap-4 py-4">
                  <Link href={`/chefs/${c.chefSlug}/${c.slug}`} className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded bg-flour">
                      {c.cover ? (
                        <Image src={c.cover} alt="" fill sizes="5rem" className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-flour to-line text-xs text-walnut/50">
                          {c.cuisine}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-iron">{c.title}</p>
                      <p className="mt-0.5 text-sm text-walnut">
                        {c.chefName ? `${c.chefName} · ` : ""}
                        {next ? `Next: ${formatSessionDateTime(next.starts_at, next.timezone)}` : "No upcoming dates"}
                      </p>
                    </div>
                  </Link>
                  <SaveButton classId={c.classId} saved />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
