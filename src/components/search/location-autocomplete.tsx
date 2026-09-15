"use client";

import { useEffect, useRef, useState } from "react";
import { fieldClass } from "@/components/auth/form-styles";

export type PlacePick = {
  label: string;
  lat: number;
  lng: number;
  placeType: string | null;
  bbox: [number, number, number, number] | null;
};

type Suggestion = {
  place_name: string;
  center: [number, number];
  place_type?: string[];
  bbox?: number[];
};

// "Where" field with Mapbox place suggestions. As the person types we fetch
// suggestions; picking one reports the place (with its scale + bounding box) up
// to the search controls. With no Mapbox token it degrades to a plain input and
// the search page geocodes the typed text on submit.
export function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  onSubmit,
}: {
  value: string;
  onChange: (text: string) => void;
  onSelect: (place: PlacePick | null) => void;
  onSubmit: () => void;
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const skipNextFetch = useRef(false);

  // Debounced suggestion fetch.
  useEffect(() => {
    if (!token) return;
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          q,
        )}.json?autocomplete=true&limit=5&types=country,region,place,district,locality,postcode,address,poi&access_token=${token}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = (await res.json()) as { features?: Suggestion[] };
        setSuggestions(data.features ?? []);
        setOpen(true);
      } catch {
        // ignore; plain typing still works
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [value, token]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function pick(s: Suggestion) {
    const [lng, lat] = s.center;
    const bbox =
      Array.isArray(s.bbox) && s.bbox.length === 4
        ? ([s.bbox[0], s.bbox[1], s.bbox[2], s.bbox[3]] as [number, number, number, number])
        : null;
    skipNextFetch.current = true; // don't re-open suggestions from the programmatic value change
    onChange(s.place_name);
    onSelect({ label: s.place_name, lat, lng, placeType: s.place_type?.[0] ?? null, bbox });
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onSelect(null); // typing a new query clears any prior pick
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setOpen(false);
            onSubmit();
          }
        }}
        placeholder="Rome, Italy (or anywhere)"
        autoComplete="off"
        className={fieldClass}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded border border-line bg-cream shadow-lg">
          {suggestions.map((s, i) => (
            <li key={`${s.place_name}-${i}`}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="block w-full px-3 py-2 text-left text-sm text-iron hover:bg-flour"
              >
                {s.place_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
