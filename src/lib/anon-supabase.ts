import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { readPublicSupabaseEnv } from "@/lib/env";

// A session-less client for contexts without a request/cookies (sitemap, robots).
// Runs as anon, so RLS returns only public data.
export function createAnonClient() {
  const env = readPublicSupabaseEnv();
  if (!env) return null;
  return createClient<Database>(env.url, env.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
