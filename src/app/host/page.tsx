import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageShell, StatusPill, ButtonLink, EmptyState } from "@/components/ui";
import { CHEF_TYPE_LABELS } from "@/components/chef/chef-type";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Chef dashboard" };

export default async function HostDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/host");

  const { data: profile } = await supabase.from("chef_profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/host/new");

  const { data: classes } = await supabase
    .from("classes")
    .select("id, title, status, cuisine, updated_at")
    .eq("chef_profile_id", profile.id)
    .order("updated_at", { ascending: false });

  const list = classes ?? [];
  const published = list.filter((c) => c.status === "published").length;

  return (
    <PageShell width="lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-walnut">{CHEF_TYPE_LABELS[profile.chef_type]}</p>
          <h1 className="mt-1 font-display text-4xl tracking-tight">
            {profile.business_name || (user.user_metadata?.display_name as string) || "Your kitchen"}
          </h1>
          {profile.headline && <p className="mt-2 max-w-prose text-walnut">{profile.headline}</p>}
          <p className="mt-3 text-sm text-walnut">
            {profile.is_suspended ? (
              <span className="text-paprika">Your account is under review and hidden from the public.</span>
            ) : (
              <>
                Public page:{" "}
                <Link
                  href={`/chefs/${profile.slug}`}
                  className="underline decoration-line underline-offset-2 hover:decoration-walnut"
                >
                  /chefs/{profile.slug}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <ButtonLink href="/host/profile" variant="secondary">
            Edit profile
          </ButtonLink>
          <ButtonLink href="/host/classes/new">New class</ButtonLink>
        </div>
      </div>

      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">Your classes</h2>
          {list.length > 0 && (
            <p className="text-sm text-walnut">
              {list.length} total · {published} published
            </p>
          )}
        </div>

        <div className="mt-4">
          {list.length === 0 ? (
            <EmptyState title="No classes yet">
              Create your first class as a draft, add a few details, then publish it when it&rsquo;s ready.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {list.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <Link href={`/host/classes/${c.id}`} className="truncate font-medium hover:text-walnut">
                        {c.title}
                      </Link>
                      <StatusPill status={c.status} />
                    </div>
                    <p className="mt-0.5 text-sm text-walnut">{c.cuisine}</p>
                  </div>
                  <Link
                    href={`/host/classes/${c.id}`}
                    className="shrink-0 rounded border border-line bg-cream px-3 py-1.5 text-sm text-iron transition-colors hover:border-walnut"
                  >
                    Manage
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </PageShell>
  );
}
