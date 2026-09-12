// Central place to read environment variables so a missing key fails with a
// clear message instead of an opaque fetch error deep inside Supabase.

export type PublicSupabaseEnv = {
  url: string;
  publishableKey: string;
};

export function readPublicSupabaseEnv(): PublicSupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export function requirePublicSupabaseEnv(): PublicSupabaseEnv {
  const env = readPublicSupabaseEnv();
  if (!env) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill both in."
    );
  }
  return env;
}

export function requireSecretKey(): string {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing SUPABASE_SECRET_KEY. It is required for admin (RLS-bypassing) server work. Use a secret key (sb_secret_...) from Settings -> API Keys.");
  }
  return key;
}
