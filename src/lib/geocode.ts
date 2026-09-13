import "server-only";

// Turn a street address into coordinates, server-side. Used when a chef saves a
// location: we geocode once, store the exact point (which a trigger fuzzes for
// public display), and never make the chef think about latitude and longitude.
//
// Provider is chosen by environment:
//   - MAPBOX_TOKEN set  -> Mapbox (production-grade, 100k/mo free tier)
//   - otherwise         -> OpenStreetMap Nominatim (no key; fine for dev and
//                          light early use, rate-limited and best replaced by a
//                          keyed provider before heavy production traffic)
// Returns null when the address can't be found or the lookup fails; callers
// surface a "check the address" message rather than saving a location with no point.

export type GeocodeResult = {
  lat: number;
  lng: number;
  label: string; // the provider's normalized address, useful for confirmation
};

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

function isValidLatLng(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

async function geocodeMapbox(address: string, token: string): Promise<GeocodeResult | null> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    address,
  )}.json?limit=1&access_token=${token}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return null;
  const data = (await res.json()) as { features?: { center?: [number, number]; place_name?: string }[] };
  const feature = data.features?.[0];
  if (!feature?.center) return null;
  const [lng, lat] = feature.center;
  if (!isValidLatLng(lat, lng)) return null;
  return { lat, lng, label: feature.place_name ?? address };
}

async function geocodeNominatim(address: string): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`;
  const res = await fetchWithTimeout(url, {
    headers: {
      // Nominatim's usage policy requires an identifying User-Agent.
      "User-Agent": "ChefConnect/1.0 (cooking class marketplace)",
      "Accept-Language": "en",
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
  const hit = data?.[0];
  if (!hit?.lat || !hit?.lon) return null;
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!isValidLatLng(lat, lng)) return null;
  return { lat, lng, label: hit.display_name ?? address };
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const trimmed = address.trim();
  if (trimmed.length < 4) return null;

  const token = process.env.MAPBOX_TOKEN;
  try {
    return token ? await geocodeMapbox(trimmed, token) : await geocodeNominatim(trimmed);
  } catch {
    // network error, timeout, or bad response — treat as "couldn't find it"
    return null;
  }
}
