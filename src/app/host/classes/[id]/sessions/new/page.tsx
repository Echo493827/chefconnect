import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SessionForm } from "@/components/chef/session-form";
import { PageShell } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Schedule a session" };

export default async function NewSessionPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/host/classes/${params.id}/sessions/new`);
  const { data: profile } = await supabase.from("chef_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/host/new");

  const { data: klass } = await supabase.from("classes").select("id, title, chef_profile_id").eq("id", params.id).maybeSingle();
  if (!klass || klass.chef_profile_id !== profile.id) notFound();

  const { data: locations } = await supabase
    .from("locations")
    .select("id, label, city")
    .eq("chef_profile_id", profile.id)
    .order("created_at", { ascending: true });

  return (
    <PageShell>
      <Link href={`/host/classes/${klass.id}`} className="text-sm text-walnut hover:text-iron">
        ← {klass.title}
      </Link>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Schedule a session</h1>
      <p className="mt-2 text-walnut">A session is one date people can book for this class.</p>
      <div className="mt-8">
        <SessionForm classId={klass.id} locations={locations ?? []} />
      </div>
    </PageShell>
  );
}
