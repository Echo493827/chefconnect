import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ClassForm } from "@/components/chef/class-form";
import { PageShell } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New class" };

export default async function NewClassPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/host/classes/new");
  const { data: profile } = await supabase.from("chef_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/host/new");

  return (
    <PageShell>
      <Link href="/host" className="text-sm text-walnut hover:text-iron">
        ← Back to dashboard
      </Link>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Create a class</h1>
      <p className="mt-2 text-walnut">This saves as a draft. You&rsquo;ll add dates and publish it on the next screen.</p>
      <div className="mt-8">
        <ClassForm userId={user.id} />
      </div>
    </PageShell>
  );
}
