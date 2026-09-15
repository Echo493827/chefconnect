import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Stars, RatingSummary } from "@/components/reviews/stars";
import { RespondForm } from "@/components/reviews/respond-form";
import { PageShell, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your reviews" };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function HostReviewsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/host/reviews");
  const { data: profile } = await supabase
    .from("chef_profiles")
    .select("id, rating_avg, rating_count")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) redirect("/host/new");

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, body, chef_response, created_at, users(display_name), classes(title)")
    .eq("chef_profile_id", profile.id)
    .order("created_at", { ascending: false });

  const list = reviews ?? [];

  return (
    <PageShell width="lg">
      <Link href="/host" className="text-sm text-walnut hover:text-iron">
        ← Back to dashboard
      </Link>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-4xl tracking-tight">Your reviews</h1>
        <RatingSummary average={profile.rating_avg} count={profile.rating_count} />
      </div>

      <div className="mt-8">
        {list.length === 0 ? (
          <EmptyState title="No reviews yet">
            Once students attend and review your classes, their feedback shows up here and you can respond.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {list.map((r) => {
              const reviewer = Array.isArray(r.users) ? r.users[0] : r.users;
              const klass = Array.isArray(r.classes) ? r.classes[0] : r.classes;
              return (
                <li key={r.id} className="py-5">
                  <div className="flex items-center gap-3">
                    <Stars value={r.rating} />
                    <span className="text-sm text-walnut">
                      {reviewer?.display_name ?? "Guest"} · {formatDate(r.created_at)}
                    </span>
                  </div>
                  {klass?.title && <p className="mt-1 text-sm text-walnut">on {klass.title}</p>}
                  {r.body && <p className="mt-2 whitespace-pre-line leading-relaxed text-iron">{r.body}</p>}
                  <div className="mt-3">
                    {r.chef_response ? (
                      <div className="rounded border border-line bg-cream/60 p-3">
                        <p className="text-xs font-medium text-walnut">Your response</p>
                        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-iron">{r.chef_response}</p>
                        <div className="mt-2">
                          <RespondForm reviewId={r.id} existing={r.chef_response} />
                        </div>
                      </div>
                    ) : (
                      <RespondForm reviewId={r.id} existing={r.chef_response} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
