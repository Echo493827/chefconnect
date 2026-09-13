import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/auth/redirects";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/account");

  const next = sanitizeNextPath(searchParams.next);

  return (
    <main className="mx-auto w-full max-w-sm px-6 pb-24 pt-16">
      <h1 className="font-display text-4xl tracking-tight">Welcome back</h1>
      <p className="mt-2 text-walnut">Sign in to book classes and manage your kitchen.</p>
      <div className="mt-8">
        <LoginForm next={next} />
      </div>
    </main>
  );
}
