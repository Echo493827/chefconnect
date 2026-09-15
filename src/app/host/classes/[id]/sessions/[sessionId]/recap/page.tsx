import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RecapForm } from "@/components/recaps/recap-form";
import { PageShell } from "@/components/ui";
import { formatSessionDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Session recap" };

export default async function RecapEditorPage({ params }: { params: { id: string; sessionId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/host/classes/${params.id}/sessions/${params.sessionId}/recap`);
  const { data: profile } = await supabase.from("chef_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/host/new");

  const { data: klass } = await supabase.from("classes").select("id, title, chef_profile_id").eq("id", params.id).maybeSingle();
  if (!klass || klass.chef_profile_id !== profile.id) notFound();

  const { data: session } = await supabase.from("sessions").select("id, class_id, starts_at, timezone").eq("id", params.sessionId).maybeSingle();
  if (!session || session.class_id !== klass.id) notFound();

  const { data: recap } = await supabase.from("recaps").select("*").eq("session_id", session.id).maybeSingle();

  return (
    <PageShell>
      <Link href={`/host/classes/${klass.id}`} className="text-sm text-walnut hover:text-iron">
        ← {klass.title}
      </Link>
      <h1 className="mt-3 font-display text-4xl tracking-tight">{recap ? "Edit recap" : "Write a recap"}</h1>
      <p className="mt-2 text-walnut">
        For the session on {formatSessionDateTime(session.starts_at, session.timezone)}. Shared only with people who booked it.
      </p>
      <div className="mt-8">
        <RecapForm sessionId={session.id} userId={user.id} recap={recap} />
      </div>
    </PageShell>
  );
}
