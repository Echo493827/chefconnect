import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/ui";
import { SKILL_LEVEL_LABELS } from "@/components/chef/chef-type";
import { formatDuration, formatSessionDateTime, seatsLeftLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

const FORMAT_LABELS: Record<string, string> = { in_person: "In person", virtual: "Virtual", hybrid: "In person + virtual" };

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
  return { supabase, chef, klass };
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

export default async function ClassDetailPage({ params }: { params: { slug: string; classSlug: string } }) {
  const found = await loadClass(params.slug, params.classSlug);
  if (!found) notFound();
  const { supabase, chef, klass } = found;

  // Upcoming, still-scheduled sessions, with the public (fuzzed) location info.
  const { data: sessionRows } = await supabase
    .from("sessions")
    .select("id, format, starts_at, timezone, inperson_capacity, virtual_capacity, inperson_booked, virtual_booked, locations(city, neighborhood)")
    .eq("class_id", klass.id)
    .eq("status", "scheduled")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  const sessions = sessionRows ?? [];
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

      <div className="mt-10 grid gap-10 md:grid-cols-[1fr_20rem]">
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
            {sessions.length === 0 ? (
              <p className="mt-2 text-sm leading-relaxed text-walnut">
                No dates are scheduled yet. Check back soon.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {sessions.map((s) => {
                  const loc = Array.isArray(s.locations) ? s.locations[0] : s.locations;
                  const area = loc ? [loc.neighborhood, loc.city].filter(Boolean).join(", ") : null;
                  const seats =
                    s.format === "virtual"
                      ? seatsLeftLabel(s.virtual_booked, s.virtual_capacity)
                      : s.format === "in_person"
                        ? seatsLeftLabel(s.inperson_booked, s.inperson_capacity)
                        : seatsLeftLabel(
                            s.inperson_booked + s.virtual_booked,
                            s.inperson_capacity + s.virtual_capacity,
                          );
                  return (
                    <li key={s.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                      <p className="font-medium">{formatSessionDateTime(s.starts_at, s.timezone)}</p>
                      <p className="mt-0.5 text-sm text-walnut">
                        {FORMAT_LABELS[s.format]}
                        {area ? ` · ${area}` : ""} · {seats}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-4 border-t border-line pt-3 text-sm text-walnut">
              Booking opens soon — that&rsquo;s the next thing we&rsquo;re building.
            </p>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
