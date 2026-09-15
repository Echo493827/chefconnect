import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChefProfileForm } from "@/components/chef/chef-profile-form";
import { PageShell } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit chef profile" };

export default async function EditChefProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/host/profile");

  const { data: profile } = await supabase.from("chef_profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/host/new");

  return (
    <PageShell>
      <Link href="/host" className="text-sm text-walnut hover:text-iron">
        ← Back to dashboard
      </Link>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Edit your chef profile</h1>
      <p className="mt-2 text-walnut">
        Your public page is at{" "}
        <Link href={`/chefs/${profile.slug}`} className="underline decoration-line underline-offset-2 hover:decoration-walnut">
          /chefs/{profile.slug}
        </Link>
        .
      </p>
      <div className="mt-8">
        <ChefProfileForm profile={profile} userId={user.id} />
      </div>
    </PageShell>
  );
}
