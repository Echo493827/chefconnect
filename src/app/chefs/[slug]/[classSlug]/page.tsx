import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/ui";
import { SKILL_LEVEL_LABELS } from "@/components/chef/chef-type";

export const dynamic = "force-dynamic";

// Resolve a class from the chef slug + class slug. RLS hides drafts, archived
// classes, and suspended chefs from the public, so this only finds live classes
// (or the chef's own, when signed in as themselves).
async function loadClass(chefSlug: string, classSlug: string) {
  const supabase = createClient();
  const { data: chef } = await supabase.from("chef_profiles").select("*").eq("slug", chefSlug).maybeSingle();
  if (!chef) return null;
  const { data: klass } = await supabase
    .from("classes")
    .select("*")
    .eq("chef_profile_id", chef.id)
    .eq("slug", classSlug)
    .maybeSingle();
  if (!klass) return null;
  return { chef, klass };
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string; classSlug: string };
}): Promise<Metadata> {
  const found = await loadClass(params.slug, params.classSlug);
  if (!found) return { title: "Class not found" };
  return { title: found.klass.title, description: found.klass.summary ?? undefined };
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export default async function ClassDetailPage({ params }: { params: { slug: string; classSlug: string } }) {
  const found = await loadClass(params.slug, params.classSlug);
  if (!found) notFound();
  const { chef, klass } = found;

  const price = klass.price_cents === 0 ? "Free" : `$${(klass.price_cents / 100).toFixed(2)}`;

  return (
    <PageShell width="lg">
      <Link href={`/chefs/${chef.slug}`} className="text-sm text-walnut hover:text-iron">
        ← {chef.business_name || "Chef"}
      </Link>

      <p className="mt-4 text-sm text-walnut">
        {klass.cuisine} · {SKILL_LEVEL_LABELS[klass.skill_level]} · {formatDuration(klass.duration_minutes)} · {price}
      </p>
      <h1 className="mt-1 font-display text-5xl leading-tight tracking-tight">{klass.title}</h1>
      {klass.summary && <p className="mt-3 max-w-prose text-lg text-walnut">{klass.summary}</p>}

      {(klass.tags.length > 0 || klass.dietary_tags.length > 0) && (
        <ul className="mt-5 flex flex-wrap gap-2">
          {klass.dietary_tags.map((t) => (
            <li key={`d-${t}`} className="rounded-sm border border-olive/30 bg-olive/10 px-2.5 py-1 text-sm text-olive-deep">
              {t}
            </li>
          ))}
          {klass.tags.map((t) => (
            <li key={`t-${t}`} className="rounded-sm border border-line bg-cream px-2.5 py-1 text-sm text-walnut">
              {t}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 grid gap-10 md:grid-cols-[1fr_18rem]">
        <div className="max-w-prose">
          {klass.description && <div className="whitespace-pre-line leading-relaxed text-iron">{klass.description}</div>}

          {klass.what_you_learn.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-xl">What you&rsquo;ll learn</h2>
              <ul className="mt-3 space-y-2">
                {klass.what_you_learn.map((item) => (
                  <li key={item} className="flex gap-2.5 text-iron">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-olive" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {klass.what_to_bring.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-xl">What to bring</h2>
              <ul className="mt-3 space-y-2">
                {klass.what_to_bring.map((item) => (
                  <li key={item} className="flex gap-2.5 text-iron">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-walnut" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="md:pt-1">
          <div className="rounded border border-line bg-cream/60 p-5">
            <h2 className="font-display text-lg">Upcoming dates</h2>
            <p className="mt-2 text-sm leading-relaxed text-walnut">
              No dates are scheduled yet. Booking opens once {chef.business_name || "the chef"} adds a session — that&rsquo;s
              the next thing we&rsquo;re building.
            </p>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
