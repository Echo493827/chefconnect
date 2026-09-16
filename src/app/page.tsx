import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { geocodeAddress, isBroadPlaceType } from "@/lib/geocode";
import { SearchControls, type SearchValues } from "@/components/search/search-controls";
import { ClassCard } from "@/components/search/class-card";
import { savedClassIds } from "@/lib/saved/get-saved";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Find a cooking class",
  description: "Browse and book cooking classes near you or anywhere you're headed, by cuisine, date, and place.",
};

type SearchParams = {
  q?: string;
  near?: string;
  from?: string;
  to?: string;
  format?: string;
  radius?: string;
  skill?: string;
  diet?: string;
  lat?: string;
  lng?: string;
  bbox?: string;
};

const SESSION_FORMATS = ["in_person", "virtual", "hybrid"] as const;
const SKILLS = ["beginner", "intermediate", "advanced", "all_levels"] as const;

function dayStartIso(date: string): string | undefined {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00Z` : undefined;
}
function dayEndIso(date: string): string | undefined {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T23:59:59Z` : undefined;
}

function parseBbox(raw: string | undefined): [number, number, number, number] | null {
  if (!raw) return null;
  const p = raw.split(",").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isFinite(n))) return null;
  return [p[0], p[1], p[2], p[3]] as [number, number, number, number];
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();

  const q = searchParams.q?.trim() ?? "";
  const near = searchParams.near?.trim() ?? "";
  const from = searchParams.from ?? "";
  const to = searchParams.to ?? "";
  const format = SESSION_FORMATS.includes(searchParams.format as never)
    ? (searchParams.format as Database["public"]["Enums"]["session_format"])
    : "";
  const skill = SKILLS.includes(searchParams.skill as never)
    ? (searchParams.skill as Database["public"]["Enums"]["skill_level"])
    : "";
  const radius = searchParams.radius ?? "40";
  const diet = (searchParams.diet ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  const radiusKm = Number(radius) || 40;

  // Resolve the search location. Priority: a bounding box picked from
  // autocomplete (broad place, area search) > a point picked from autocomplete
  // (precise place, radius search) > free text typed, which we geocode here and
  // treat as an area if it's a country/city, otherwise a radius around the point.
  let bbox: [number, number, number, number] | null = parseBbox(searchParams.bbox);
  let center: { lat: number; lng: number } | null =
    searchParams.lat && searchParams.lng && Number.isFinite(Number(searchParams.lat)) && Number.isFinite(Number(searchParams.lng))
      ? { lat: Number(searchParams.lat), lng: Number(searchParams.lng) }
      : null;
  let placeNotFound = false;

  if (near && !bbox && !center) {
    const geo = await geocodeAddress(near);
    if (geo) {
      if (geo.bbox && isBroadPlaceType(geo.placeType)) bbox = geo.bbox;
      else center = { lat: geo.lat, lng: geo.lng };
    } else {
      placeNotFound = true;
    }
  }

  const { data: results, error } = await supabase.rpc("search_classes", {
    p_query: q || undefined,
    // area (bounding-box) search takes priority; otherwise radius around a point
    p_min_lng: bbox ? bbox[0] : undefined,
    p_min_lat: bbox ? bbox[1] : undefined,
    p_max_lng: bbox ? bbox[2] : undefined,
    p_max_lat: bbox ? bbox[3] : undefined,
    p_lat: !bbox && center ? center.lat : undefined,
    p_lng: !bbox && center ? center.lng : undefined,
    p_radius_km: !bbox && center ? radiusKm : undefined,
    p_date_from: from ? dayStartIso(from) : undefined,
    p_date_to: to ? dayEndIso(to) : undefined,
    p_format: format || undefined,
    p_skill: skill || undefined,
    p_dietary: diet.length ? diet : undefined,
  });

  const list = results ?? [];
  const saved = await savedClassIds(list.map((r) => r.class_id));
  const hasFilters = Boolean(q || near || from || to || format || skill || diet.length);
  const initial: SearchValues = { q, near, from, to, format, radius, skill, diet };

  let heading = "Find a cooking class";
  if (near && (center || bbox)) heading = q ? `\u201C${q}\u201D in ${near}` : `Cooking classes in ${near}`;
  else if (q) heading = `Results for \u201C${q}\u201D`;
  else if (hasFilters) heading = "Matching classes";

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pb-24 pt-10">
      <div className="mb-6">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Find a cooking class</h1>
        <p className="mt-2 max-w-prose text-walnut">
          Taught by the people who cook &mdash; at home, in restaurants, and online. Search where you are, or anywhere
          you&rsquo;re headed.
        </p>
      </div>

      <SearchControls initial={initial} />

      {placeNotFound && (
        <p className="mt-4 rounded border border-turmeric/40 bg-turmeric/10 px-4 py-3 text-sm text-iron">
          We couldn&rsquo;t find &ldquo;{near}&rdquo;. Showing all classes instead &mdash; try a city and country, like
          &ldquo;Rome, Italy&rdquo;.
        </p>
      )}

      <section className="mt-8">
        <h2 className="font-display text-2xl">{heading}</h2>
        {error ? (
          <p className="mt-4 text-walnut">Something went wrong loading classes. Please try again in a moment.</p>
        ) : list.length === 0 ? (
          <div className="mt-4 rounded border border-dashed border-line bg-cream/60 px-6 py-12 text-center">
            <p className="font-display text-xl">No classes match yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-walnut">
              {hasFilters
                ? "Try widening your dates, a broader area, or fewer filters."
                : "No classes have upcoming dates right now. Check back soon \u2014 or if you cook, be the first to teach one."}
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((r) => (
              <li key={r.class_id}>
                <ClassCard result={r} saved={saved.has(r.class_id) ? true : undefined} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
