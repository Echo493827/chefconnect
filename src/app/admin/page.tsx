import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageShell, StatusPill, EmptyState } from "@/components/ui";
import { ClassModeration, ChefModeration, ReportModeration } from "@/components/admin/moderation-controls";
import { CHEF_TYPE_LABELS } from "@/components/chef/chef-type";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Moderation" };

const TARGET_LABELS: Record<string, string> = {
  class: "Class",
  session: "Session",
  chef_profile: "Chef",
  review: "Review",
  recap: "Recap",
  user: "User",
};

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: me } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") redirect("/");

  // Admin views use the service-role client so the full picture is visible
  // regardless of RLS; every state-changing action still goes through the
  // is_admin-checked RPCs.
  const admin = createAdminClient();

  const [{ data: reports }, { data: chefs }, { data: classes }] = await Promise.all([
    admin
      .from("reports")
      .select("id, target_type, target_id, reason, details, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("chef_profiles")
      .select("id, slug, business_name, chef_type, is_suspended, rating_count, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("classes")
      .select("id, slug, title, status, chef_profile_id, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);

  const openReports = reports ?? [];
  const chefList = chefs ?? [];
  const classList = classes ?? [];

  return (
    <PageShell width="lg">
      <h1 className="font-display text-4xl tracking-tight">Moderation</h1>
      <p className="mt-2 text-walnut">
        Content stays up by default. Take down anything that breaks the rules, and reinstate it if that was a mistake.
      </p>

      <section className="mt-12">
        <h2 className="font-display text-2xl">Open reports</h2>
        <div className="mt-4">
          {openReports.length === 0 ? (
            <EmptyState title="Nothing to review">No open reports right now.</EmptyState>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {openReports.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{TARGET_LABELS[r.target_type] ?? r.target_type}</span> reported for{" "}
                      <span className="text-paprika">{r.reason}</span>
                    </p>
                    {r.details && <p className="mt-1 text-sm text-walnut">{r.details}</p>}
                    <p className="mt-1 font-mono text-xs text-walnut/70">{r.target_id}</p>
                  </div>
                  <ReportModeration reportId={r.id} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl">Chefs</h2>
        <div className="mt-4">
          {chefList.length === 0 ? (
            <EmptyState title="No chefs yet">Chef profiles will appear here as people sign up to teach.</EmptyState>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {chefList.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <Link href={`/chefs/${c.slug}`} className="truncate font-medium hover:text-walnut">
                        {c.business_name || c.slug}
                      </Link>
                      {c.is_suspended && (
                        <span className="rounded-sm border border-paprika/30 bg-paprika/10 px-2 py-0.5 text-xs text-paprika">
                          Suspended
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-walnut">
                      {CHEF_TYPE_LABELS[c.chef_type]} · {c.rating_count} reviews
                    </p>
                  </div>
                  <ChefModeration chefProfileId={c.id} suspended={c.is_suspended} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl">Recent classes</h2>
        <div className="mt-4">
          {classList.length === 0 ? (
            <EmptyState title="No classes yet">Classes will appear here as chefs create them.</EmptyState>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {classList.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="truncate font-medium">{c.title}</span>
                    <StatusPill status={c.status} />
                  </div>
                  <ClassModeration classId={c.id} status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </PageShell>
  );
}
