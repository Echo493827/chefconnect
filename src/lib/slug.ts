// Turn a title or name into a URL-safe slug, and make it unique within whatever
// set the caller checks. The DB has the final say (unique indexes on
// chef_profiles.slug and classes(chef_profile_id, slug)); this just produces a
// clean candidate and resolves the common collision case before we try to write.

const RANDOM_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function slugify(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumerics become hyphens
    .replace(/^-+|-+$/g, "") // trim hyphens
    .slice(0, 60)
    .replace(/-+$/g, "");
  return base;
}

function randomSuffix(length = 4): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += RANDOM_ALPHABET[Math.floor(Math.random() * RANDOM_ALPHABET.length)];
  }
  return out;
}

// Produce a slug that isn't already taken. `exists` reports whether a candidate
// collides; we try the clean slug first, then append a short random suffix.
export async function uniqueSlug(
  input: string,
  exists: (candidate: string) => Promise<boolean>,
  fallback = "class",
): Promise<string> {
  let base = slugify(input);
  if (base.length < 3) base = slugify(`${fallback}-${base}`) || fallback;

  if (!(await exists(base))) return base;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = `${base}-${randomSuffix()}`.slice(0, 60).replace(/-+$/g, "");
    if (!(await exists(candidate))) return candidate;
  }
  // extremely unlikely; last resort keeps it unique enough to insert
  return `${base}-${Date.now().toString(36)}`.slice(0, 60);
}
