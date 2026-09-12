import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { requirePublicSupabaseEnv, requireSecretKey } from "@/lib/env";

// Secret-key (service role) client. BYPASSES Row Level Security, so use it only for trusted
// server work (admin tooling, notifications, scheduled jobs) and never pass its
// results straight to a user without scoping them yourself. The "server-only"
// import makes Next.js refuse to bundle this file into the browser.
export function createAdminClient() {
  const { url } = requirePublicSupabaseEnv();
  return createSupabaseClient<Database>(url, requireSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
