import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Change password" };

export default async function ChangePasswordPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/password");

  return (
    <main className="mx-auto w-full max-w-sm px-6 pb-24 pt-16">
      <Link href="/account" className="text-sm text-walnut hover:text-iron">
        ← Back to account
      </Link>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Change password</h1>
      <p className="mt-2 text-walnut">Choose a new password for your account.</p>
      <div className="mt-8">
        <UpdatePasswordForm />
      </div>
    </main>
  );
}
