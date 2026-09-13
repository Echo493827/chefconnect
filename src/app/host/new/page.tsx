import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ChefProfileForm } from "@/components/chef/chef-profile-form";
import { PageShell } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Become a chef" };

export default async function BecomeChefPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/host/new");

  const { data: existing } = await supabase.from("chef_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (existing) redirect("/host");

  return (
    <PageShell>
      <h1 className="font-display text-4xl tracking-tight">Teach a class</h1>
      <p className="mt-2 max-w-prose leading-relaxed text-walnut">
        Anyone can teach on ChefConnect — home cooks, restaurant chefs, creators, schools. Set up your chef profile,
        then create your first class. You can keep it as a draft until it&rsquo;s ready to share.
      </p>
      <div className="mt-8">
        <ChefProfileForm />
      </div>
    </PageShell>
  );
}
