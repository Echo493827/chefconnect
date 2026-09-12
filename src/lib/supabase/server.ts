import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { requirePublicSupabaseEnv } from "@/lib/env";

// Server-side client for Server Components, Server Actions and Route Handlers.
// Reads the user's session from cookies and is subject to Row Level Security,
// exactly like the browser client. Create a new one per request.
export function createClient() {
  const { url, publishableKey } = requirePublicSupabaseEnv();
  const cookieStore = cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The middleware refreshes sessions, so this is safe to ignore.
        }
      },
    },
  });
}
