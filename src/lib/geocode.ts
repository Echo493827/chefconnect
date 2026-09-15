import "server-only";

// Turn an address or place into coordinates AND its scale, server-side. Used
// when a chef saves a location and as the fallback when a searcher types a place
// without picking a suggestion.
//
// Mapbox (preferred) returns a place "type" (country / region / place / address /
// …) and, for broad places, a bounding box — which is what lets search widen the
// area for a country and tighten it for a street. Falls back to OpenStreetMap
// (point only, no scale) when no Mapbox token is set.

export type GeocodeResult = {
  lat: number;
  lng: number;
  label: string;
  placeType: string | null;
  bbox: [number, number, number, number] | null; // [minLng, minLat, maxLng, maxLat]
};

// Broad place kinds get an area (bounding-box) search; everything else a point.
const BROAD_TYPES = new Set(["country", "region", "place", "district", "locality"]);

export function isBroadPlaceType(placeType: string | null | undefined): boolean {
  return Boolean(placeType && BROAD_TYPES.has(placeType));
}

function mapboxToken(): string | undefined {
  // NEXT_PUBLIC works on the server too; a server-only MAPBOX_TOKEN also honored.
  return process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
}

const TIMEOUT_MS = 6000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function validLatLng(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

async function geocodeMapbox(address: string, token: string): Promise<GeocodeResult | null> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    address,
  )}.json?limit=1&access_token=${token}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    features?: { center?: [number, number]; place_name?: string; place_type?: string[]; bbox?: number[] }[];
  };
  const f = data.features?.[0];
  if (!f?.center) return null;
  const [lng, lat] = f.center;
  if (!validLatLng(lat, lng)) return null;
  const bbox =
    Array.isArray(f.bbox) && f.bbox.length === 4
      ? ([f.bbox[0], f.bbox[1], f.bbox[2], f.bbox[3]] as [number, number, number, number])
      : null;
  return { lat, lng, label: f.place_name ?? address, placeType: f.place_type?.[0] ?? null, bbox };
}

async function geocodeNominatim(address: string): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`;
  const res = await fetchWithTimeout(url, {
    headers: { "User-Agent": "ChefConnect/1.0 (cooking class marketplace)", "Accept-Language": "en" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
  const hit = data?.[0];
  if (!hit?.lat || !hit?.lon) return null;
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!validLatLng(lat, lng)) return null;
  // OSM fallback: point only, no scale.
  return { lat, lng, label: hit.display_name ?? address, placeType: null, bbox: null };
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const trimmed = address.trim();
  if (trimmed.length < 2) return null;
  const token = mapboxToken();
  try {
    return token ? await geocodeMapbox(trimmed, token) : await geocodeNominatim(trimmed);
  } catch {
    return null;
  }
}
