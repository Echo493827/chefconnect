import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ClassForm } from "@/components/chef/class-form";
import { PublishControls } from "@/components/chef/publish-controls";
import { PageShell, StatusPill } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit class" };

export default async function EditClassPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/host/classes/${params.id}`);

  const { data: profile } = await supabase.from("chef_profiles").select("id, slug").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/host/new");

  // RLS lets a chef read their own class at any status; a stranger's id returns nothing.
  const { data: klass } = await supabase.from("classes").select("*").eq("id", params.id).maybeSingle();
  if (!klass || klass.chef_profile_id !== profile.id) notFound();

  return (
    <PageShell>
      <Link href="/host" className="text-sm text-walnut hover:text-iron">
        ← Back to dashboard
      </Link>

      <div className="mt-3 flex items-center gap-3">
        <h1 className="font-display text-4xl tracking-tight">{klass.title}</h1>
        <StatusPill status={klass.status} />
      </div>

      <div className="mt-6 rounded border border-line bg-cream/50 p-4">
        <PublishControls classId={klass.id} status={klass.status} />
        <p className="mt-3 text-sm text-walnut">
          {klass.status === "published" ? (
            <>
              Live at{" "}
              <Link
                href={`/chefs/${profile.slug}/${klass.slug}`}
                className="underline decoration-line underline-offset-2 hover:decoration-walnut"
              >
                /chefs/{profile.slug}/{klass.slug}
              </Link>
              . Add dates so people can book — session scheduling is coming next.
            </>
          ) : klass.status === "draft" ? (
            "This class is a draft — only you can see it. Publish when you're ready to share it."
          ) : (
            "This class is archived and hidden from the public. Switch it back to draft to work on it again."
          )}
        </p>
      </div>

      <div className="mt-10">
        <ClassForm klass={klass} />
      </div>
    </PageShell>
  );
}
