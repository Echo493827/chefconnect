import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RecapView } from "@/components/recaps/recap-view";
import { PageShell } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Class recap" };

export default async function RecapPage({ params }: { params: { sessionId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/recaps/${params.sessionId}`);

  // RLS only returns this row if the recap is published and the viewer has a live
  // booking for the session (or is the chef). So a plain fetch is the gate.
  const { data: recap } = await supabase
    .from("recaps")
    .select("session_id, title, body, photo_urls, attachments, sessions(classes(title, slug, chef_profiles(slug, business_name)))")
    .eq("session_id", params.sessionId)
    .maybeSingle();

  if (!recap) notFound();

  const session = Array.isArray(recap.sessions) ? recap.sessions[0] : recap.sessions;
  const klass = session && (Array.isArray(session.classes) ? session.classes[0] : session.classes);
  const chef = klass && (Array.isArray(klass.chef_profiles) ? klass.chef_profiles[0] : klass.chef_profiles);

  return (
    <PageShell>
      <Link href="/bookings" className="text-sm text-walnut hover:text-iron">
        ← Back to my bookings
      </Link>
      <div className="mt-3">
        {klass && (
          <p className="mb-4 text-sm text-walnut">
            {klass.title}
            {chef?.business_name ? ` · ${chef.business_name}` : ""}
          </p>
        )}
        <RecapView
          recap={{
            title: recap.title,
            body: recap.body,
            photo_urls: recap.photo_urls,
            attachments: (recap.attachments as { label: string; url: string }[]) ?? [],
          }}
        />
      </div>
    </PageShell>
  );
}
