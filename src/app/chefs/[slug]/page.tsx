import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/ui";
import { CHEF_TYPE_LABELS, SKILL_LEVEL_LABELS } from "@/components/chef/chef-type";
import { ReviewList } from "@/components/reviews/review-list";
import { RatingSummary } from "@/components/reviews/stars";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase.from("chef_profiles").select("business_name, headline").eq("slug", params.slug).maybeSingle();
  if (!data) return { title: "Chef not found" };
  return { title: data.business_name || "Chef", description: data.headline ?? undefined };
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export default async function ChefProfilePage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  // RLS returns nothing for a suspended or nonexistent chef unless it's the owner.
  const { data: chef } = await supabase.from("chef_profiles").select("*").eq("slug", params.slug).maybeSingle();
  if (!chef) notFound();

  const { data: classes } = await supabase
    .from("classes")
    .select("slug, title, summary, cuisine, skill_level, duration_minutes")
    .eq("chef_profile_id", chef.id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const { data: reviewRows } = await supabase
    .from("reviews")
    .select("id, rating, body, chef_response, created_at, users(display_name), classes(title)")
    .eq("chef_profile_id", chef.id)
    .order("created_at", { ascending: false })
    .limit(20);
  const reviews = (reviewRows ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    chef_response: r.chef_response,
    created_at: r.created_at,
    reviewer_name: (Array.isArray(r.users) ? r.users[0] : r.users)?.display_name ?? null,
    class_title: (Array.isArray(r.classes) ? r.classes[0] : r.classes)?.title ?? null,
  }));

  const social = (chef.social_links ?? {}) as Record<string, string>;
  const list = classes ?? [];

  return (
    <PageShell width="lg">
      {chef.cover_image_url && (
        <div className="relative mb-6 aspect-[16/9] w-full overflow-hidden rounded-lg border border-line sm:aspect-[3/1]">
          <Image src={chef.cover_image_url} alt="" fill sizes="(max-width: 1024px) 100vw, 64rem" className="object-cover" priority />
        </div>
      )}
      <p className="text-sm text-walnut">{CHEF_TYPE_LABELS[chef.chef_type]}</p>
      <h1 className="mt-1 font-display text-5xl tracking-tight">{chef.business_name || "Chef"}</h1>
      {chef.headline && <p className="mt-3 max-w-prose text-lg text-walnut">{chef.headline}</p>}
      {chef.rating_count > 0 && <div className="mt-3"><RatingSummary average={chef.rating_avg} count={chef.rating_count} /></div>}

      {chef.specialties.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2">
          {chef.specialties.map((s) => (
            <li key={s} className="rounded-sm border border-line bg-cream px-2.5 py-1 text-sm text-walnut">
              {s}
            </li>
          ))}
        </ul>
      )}

      {(social.website || social.instagram || social.youtube) && (
        <div className="mt-5 flex flex-wrap gap-4 text-sm">
          {social.website && (
            <a href={social.website} target="_blank" rel="noopener noreferrer" className="text-olive-deep underline decoration-line underline-offset-2">
              Website
            </a>
          )}
          {social.instagram && <span className="text-walnut">Instagram {social.instagram}</span>}
          {social.youtube && (
            <a href={social.youtube} target="_blank" rel="noopener noreferrer" className="text-olive-deep underline decoration-line underline-offset-2">
              YouTube
            </a>
          )}
        </div>
      )}

      {chef.about && (
        <div className="mt-8 max-w-prose whitespace-pre-line leading-relaxed text-iron">{chef.about}</div>
      )}

      <section className="mt-12">
        <h2 className="font-display text-2xl">Classes</h2>
        <div className="mt-4">
          {list.length === 0 ? (
            <p className="text-walnut">No classes are open right now. Check back soon.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {list.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/chefs/${chef.slug}/${c.slug}`}
                    className="block h-full rounded border border-line bg-cream/60 p-5 transition-colors hover:border-walnut"
                  >
                    <p className="text-xs text-walnut">
                      {c.cuisine} · {SKILL_LEVEL_LABELS[c.skill_level]} · {formatDuration(c.duration_minutes)}
                    </p>
                    <p className="mt-1.5 font-display text-xl leading-snug">{c.title}</p>
                    {c.summary && <p className="mt-1.5 text-sm leading-relaxed text-walnut">{c.summary}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="mt-12 border-t border-line pt-8">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-2xl">Reviews</h2>
            <RatingSummary average={chef.rating_avg} count={chef.rating_count} />
          </div>
          <div className="mt-4">
            <ReviewList reviews={reviews} />
          </div>
        </section>
      )}
    </PageShell>
  );
}
