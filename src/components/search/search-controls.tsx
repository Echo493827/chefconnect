"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fieldClass, labelClass } from "@/components/auth/form-styles";
import { LocationAutocomplete, type PlacePick } from "@/components/search/location-autocomplete";

export type SearchValues = {
  q: string;
  near: string;
  from: string;
  to: string;
  format: string; // "" | "in_person" | "virtual"
  radius: string; // km
  skill: string;
  diet: string[];
};

const FORMAT_OPTS: [string, string][] = [
  ["", "Any"],
  ["in_person", "In person"],
  ["virtual", "Online"],
];
const BROAD_TYPES = new Set(["country", "region", "place", "district", "locality"]);
const DIETARY = ["vegetarian", "vegan", "halal", "gluten-free"];
const RADII: [string, string][] = [
  ["10", "Within 10 km"],
  ["25", "Within 25 km"],
  ["40", "Within 40 km"],
  ["100", "Within 100 km"],
];

export function SearchControls({ initial }: { initial: SearchValues }) {
  const router = useRouter();
  const [v, setV] = useState<SearchValues>(initial);
  const [place, setPlace] = useState<PlacePick | null>(null);
  const [showFilters, setShowFilters] = useState(
    Boolean(initial.format || initial.skill || initial.diet.length || (initial.near && initial.radius !== "40")),
  );

  function set<K extends keyof SearchValues>(key: K, value: SearchValues[K]) {
    setV((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDiet(tag: string) {
    setV((prev) => ({
      ...prev,
      diet: prev.diet.includes(tag) ? prev.diet.filter((d) => d !== tag) : [...prev.diet, tag],
    }));
  }

  function submit() {
    const params = new URLSearchParams();
    if (v.q.trim()) params.set("q", v.q.trim());
    if (v.near.trim()) params.set("near", v.near.trim());
    // If a place was picked, carry its geography so the page can search the right
    // scale: a broad place (country/city) searches its bounding box; a precise
    // place searches a radius around the point.
    if (place) {
      const broad = place.bbox && place.placeType && BROAD_TYPES.has(place.placeType);
      if (broad && place.bbox) {
        params.set("bbox", place.bbox.join(","));
      } else {
        params.set("lat", String(place.lat));
        params.set("lng", String(place.lng));
        if (v.radius && v.radius !== "40") params.set("radius", v.radius);
      }
    } else if (v.near.trim() && v.radius && v.radius !== "40") {
      params.set("radius", v.radius);
    }
    if (v.from) params.set("from", v.from);
    if (v.to) params.set("to", v.to);
    if (v.format) params.set("format", v.format);
    if (v.skill) params.set("skill", v.skill);
    if (v.diet.length) params.set("diet", v.diet.join(","));
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  return (
    <div className="rounded-lg border border-line bg-cream/70 p-4 sm:p-5">
      <div className="grid gap-3 md:grid-cols-[1.3fr_1fr_auto]">
        <div>
          <label htmlFor="q" className={labelClass}>
            What
          </label>
          <input
            id="q"
            type="text"
            value={v.q}
            onChange={(e) => set("q", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Pizza, sushi, knife skills…"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="near" className={labelClass}>
            Where
          </label>
          <LocationAutocomplete
            value={v.near}
            onChange={(text) => set("near", text)}
            onSelect={setPlace}
            onSubmit={submit}
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={submit}
            className="h-[42px] w-full rounded bg-olive px-6 font-medium text-cream transition-colors hover:bg-olive-deep md:w-auto"
          >
            Search
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="from" className={labelClass}>
            From
          </label>
          <input id="from" type="date" value={v.from} onChange={(e) => set("from", e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="to" className={labelClass}>
            To
          </label>
          <input id="to" type="date" value={v.to} onChange={(e) => set("to", e.target.value)} className={fieldClass} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowFilters((s) => !s)}
        className="mt-3 text-sm text-walnut underline decoration-line underline-offset-2 hover:text-iron"
      >
        {showFilters ? "Hide filters" : "More filters"}
      </button>

      {showFilters && (
        <div className="mt-3 grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
          <div>
            <span className={labelClass}>Format</span>
            <div className="mt-1.5 flex gap-2">
              {FORMAT_OPTS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("format", value)}
                  className={`rounded border px-3 py-1.5 text-sm transition-colors ${
                    v.format === value ? "border-olive bg-olive/10 text-olive-deep" : "border-line bg-cream text-walnut hover:border-walnut"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="radius" className={labelClass}>
              Distance <span className="text-walnut/60">(with a location)</span>
            </label>
            <select id="radius" value={v.radius} onChange={(e) => set("radius", e.target.value)} className={fieldClass}>
              {RADII.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="skill" className={labelClass}>
              Skill level
            </label>
            <select id="skill" value={v.skill} onChange={(e) => set("skill", e.target.value)} className={fieldClass}>
              <option value="">Any</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="all_levels">All levels</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <span className={labelClass}>Dietary</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {DIETARY.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleDiet(tag)}
                  className={`rounded-sm border px-3 py-1.5 text-sm capitalize transition-colors ${
                    v.diet.includes(tag) ? "border-olive bg-olive/10 text-olive-deep" : "border-line bg-cream text-walnut hover:border-walnut"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
