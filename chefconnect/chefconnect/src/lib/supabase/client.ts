"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { requirePublicSupabaseEnv } from "@/lib/env";

// Browser-side client. Runs as the signed-in user (or anon) and is fully
// subject to Row Level Security. Safe to use in Client Components.
export function createClient() {
  const { url, publishableKey } = requirePublicSupabaseEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
