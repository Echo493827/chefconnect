import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "@/components/auth/signup-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/account");

  return (
    <main className="mx-auto w-full max-w-sm px-6 pb-24 pt-16">
      <h1 className="font-display text-4xl tracking-tight">Create your account</h1>
      <p className="mt-2 text-walnut">Find a class, book a seat, and cook something new.</p>
      <div className="mt-8">
        <SignupForm />
      </div>
    </main>
  );
}
