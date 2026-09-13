import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readPublicSupabaseEnv } from "@/lib/env";

// Route prefixes that require a signed-in user. Add to this as pages are built
// (e.g. "/host" when chef tools land); unauthenticated visitors are sent to /login.
const PROTECTED_PREFIXES: string[] = ["/account", "/host", "/admin", "/bookings", "/book"];

// Refreshes the Supabase session cookie on every request so Server Components
// never see a stale or expired session, and enforces PROTECTED_PREFIXES.
export async function updateSession(request: NextRequest) {
  const env = readPublicSupabaseEnv();
  if (!env) return NextResponse.next({ request }); // let the app render its setup message

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() validates the token with Supabase Auth; never trust getSession()
  // here. If Supabase is unreachable, treat the visitor as signed out rather
  // than erroring every page on the site.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}
