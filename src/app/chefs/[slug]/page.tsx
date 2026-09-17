import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/ui";
import { CHEF_TYPE_LABELS } from "@/components/chef/chef-type";
import { ReviewList } from "@/components/reviews/review-list";
import { RatingSummary } from "@/components/reviews/stars";
import { ClassCard } from "@/components/search/class-card";
import { savedClassIds } from "@/lib/saved/get-saved";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase.from("chef_profiles").select("business_name, headline, cover_image_url").eq("slug", params.slug).maybeSingle();
  if (!data) return { title: "Chef not found" };
  const name = data.business_name || "Chef";
  const desc = data.headline ?? `Cooking classes with ${name}.`;
  const images = data.cover_image_url ? [{ url: data.cover_image_url }] : undefined;
  return {
    title: name,
    description: desc,
    openGraph: { title: name, description: desc, type: "profile", ...(images ? { images } : {}) },
    twitter: { card: "summary_large_image", title: name, description: desc, ...(images ? { images: [data.cover_image_url as string] } : {}) },
  };
}

export default async function ChefProfilePage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  // RLS returns nothing for a suspended or nonexistent chef unless it's the owner.
  const { data: chef } = await supabase.from("chef_profiles").select("*").eq("slug", params.slug).maybeSingle();
  if (!chef) notFound();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, slug, title, summary, cuisine, skill_level, duration_minutes, price_cents, cover_image_url")
    .eq("chef_profile_id", chef.id)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  const classList = classes ?? [];

  // Next upcoming session per class, so each card can show real availability.
  const classIds = classList.map((c) => c.id);
  type NextSession = {
    class_id: string;
    id: string;
    starts_at: string;
    timezone: string;
    format: "in_person" | "virtual" | "hybrid";
    inperson_capacity: number;
    virtual_capacity: number;
    inperson_booked: number;
    virtual_booked: number;
    locations:
      | { city: string | null; neighborhood: string | null }
      | { city: string | null; neighborhood: string | null }[]
      | null;
  };
  const sessionRows: NextSession[] = classIds.length
    ? (((
        await supabase
          .from("sessions")
          .select(
            "class_id, id, starts_at, timezone, format, inperson_capacity, virtual_capacity, inperson_booked, virtual_booked, locations(city, neighborhood)",
          )
          .in("class_id", classIds)
          .eq("status", "scheduled")
          .gt("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
      ).data ?? []) as NextSession[])
    : [];

  // Build class-card rows (only for classes that have an upcoming session).
  const nextByClass = new Map<string, NextSession>();
  const countByClass = new Map<string, number>();
  for (const s of sessionRows) {
    countByClass.set(s.class_id, (countByClass.get(s.class_id) ?? 0) + 1);
    if (!nextByClass.has(s.class_id)) nextByClass.set(s.class_id, s);
  }

  const cards = classList
    .map((c) => {
      const s = nextByClass.get(c.id);
      if (!s) return null;
      const loc = Array.isArray(s.locations) ? s.locations[0] : s.locations;
      const seatsLeft =
        s.format === "virtual"
          ? s.virtual_capacity - s.virtual_booked
          : s.format === "in_person"
            ? s.inperson_capacity - s.inperson_booked
            : s.inperson_capacity + s.virtual_capacity - s.inperson_booked - s.virtual_booked;
      return {
        class_id: c.id,
        class_slug: c.slug,
        title: c.title,
        summary: c.summary,
        cuisine: c.cuisine,
        skill_level: c.skill_level,
        duration_minutes: c.duration_minutes,
        price_cents: c.price_cents,
        cover_image_url: c.cover_image_url,
        chef_slug: chef.slug,
        chef_name: chef.business_name,
        next_session_id: s.id,
        next_starts_at: s.starts_at,
        next_timezone: s.timezone,
        next_format: s.format,
        city: loc?.city ?? null,
        neighborhood: loc?.neighborhood ?? null,
        seats_left: seatsLeft,
        session_count: countByClass.get(c.id) ?? 1,
        distance_km: null,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const savedSet = await savedClassIds(cards.map((c) => c.class_id));

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
  const name = chef.business_name || "Chef";
  const monogram = name.trim().charAt(0).toUpperCase();
  const verified = chef.verification_status === "verified";

  const stats: string[] = [];
  if (classList.length > 0) stats.push(`${classList.length} ${classList.length === 1 ? "class" : "classes"}`);
  if (chef.rating_count > 0) stats.push(`${chef.rating_count} ${chef.rating_count === 1 ? "review" : "reviews"}`);
  if (chef.years_experience) stats.push(`${chef.years_experience} yr${chef.years_experience === 1 ? "" : "s"} teaching`);

  return (
    <PageShell width="lg">
      {/* Cover banner */}
      <div className="relative -mt-2 aspect-[16/9] w-full overflow-hidden rounded-lg border border-line sm:aspect-[3/1]">
        {chef.cover_image_url ? (
          <Image src={chef.cover_image_url} alt="" fill sizes="(max-width: 1024px) 100vw, 64rem" className="object-cover" priority />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-flour to-line" />
        )}
      </div>

      {/* Header: monogram + name + rating + type */}
      <div className="relative -mt-10 flex flex-wrap items-end gap-4 px-1 sm:-mt-12">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-flour bg-olive font-display text-3xl text-cream shadow-sm sm:h-24 sm:w-24">
          {monogram}
        </div>
        <div className="pb-1">
          <p className="text-sm text-walnut">
            {CHEF_TYPE_LABELS[chef.chef_type]}
            {verified && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-sm border border-olive/30 bg-olive/10 px-1.5 py-0.5 text-xs text-olive-deep">
                ✓ Verified
              </span>
            )}
          </p>
          <h1 className="mt-0.5 font-display text-4xl leading-tight tracking-tight sm:text-5xl">{name}</h1>
        </div>
      </div>

      {chef.headline && <p className="mt-4 max-w-prose text-lg text-walnut">{chef.headline}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-walnut">
        {chef.rating_count > 0 && <RatingSummary average={chef.rating_avg} count={chef.rating_count} />}
        {chef.rating_count > 0 && stats.length > 0 && <span aria-hidden="true">·</span>}
        {stats.join(" · ")}
      </div>

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

      {chef.about && <div className="mt-8 max-w-prose whitespace-pre-line leading-relaxed text-iron">{chef.about}</div>}

      <section className="mt-12">
        <h2 className="font-display text-2xl">Classes</h2>
        <div className="mt-4">
          {cards.length === 0 ? (
            <p className="text-walnut">No classes with upcoming dates right now. Check back soon.</p>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((c) => (
                <li key={c.class_id}>
                  <ClassCard result={c} saved={savedSet.has(c.class_id) ? true : undefined} />
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
