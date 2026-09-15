import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ClassForm } from "@/components/chef/class-form";
import { PublishControls } from "@/components/chef/publish-controls";
import { CancelSessionButton } from "@/components/chef/cancel-session-button";
import { PageShell, StatusPill, ButtonLink, EmptyState } from "@/components/ui";
import { formatSessionDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit class" };

const FORMAT_LABELS: Record<string, string> = { in_person: "In person", virtual: "Virtual", hybrid: "Hybrid" };

export default async function EditClassPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/host/classes/${params.id}`);

  const { data: profile } = await supabase.from("chef_profiles").select("id, slug").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/host/new");

  const { data: klass } = await supabase.from("classes").select("*").eq("id", params.id).maybeSingle();
  if (!klass || klass.chef_profile_id !== profile.id) notFound();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, format, starts_at, timezone, status, inperson_capacity, virtual_capacity, inperson_booked, virtual_booked")
    .eq("class_id", klass.id)
    .order("starts_at", { ascending: true });

  // recap status per session (draft vs shared), to label the recap action
  const sessionIds = (sessions ?? []).map((s) => s.id);
  const { data: recapRows } = sessionIds.length
    ? await supabase.from("recaps").select("session_id, published_at").in("session_id", sessionIds)
    : { data: [] as { session_id: string; published_at: string | null }[] };
  const recapBySession = new Map((recapRows ?? []).map((r) => [r.session_id, r]));

  const now = Date.now();
  const upcoming = (sessions ?? []).filter((s) => s.status !== "cancelled" && new Date(s.starts_at).getTime() > now);
  const past = (sessions ?? []).filter((s) => s.status === "cancelled" || new Date(s.starts_at).getTime() <= now);

  return (
    <PageShell width="lg">
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
              . Add dates below so people can book.
            </>
          ) : klass.status === "draft" ? (
            "This class is a draft, so only you can see it. Publish when you're ready to share it."
          ) : (
            "This class is archived and hidden from the public. Switch it back to draft to work on it again."
          )}
        </p>
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Sessions</h2>
          <div className="flex gap-3">
            <ButtonLink href={`/host/classes/${klass.id}/recipes`} variant="secondary">
              Recipes & prep
            </ButtonLink>
            <ButtonLink href={`/host/classes/${klass.id}/sessions/new`}>Schedule a session</ButtonLink>
          </div>
        </div>
        <div className="mt-4">
          {upcoming.length === 0 && past.length === 0 ? (
            <EmptyState title="No sessions yet">
              A session is one date people can book. Schedule your first so this class can take bookings.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {[...upcoming, ...past].map((s) => {
                const cancelled = s.status === "cancelled";
                const isPast = new Date(s.starts_at).getTime() <= now;
                const booked = s.inperson_booked + s.virtual_booked;
                const capacity = s.inperson_capacity + s.virtual_capacity;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-4 py-4">
                    <div className={cancelled ? "text-walnut line-through" : ""}>
                      <p className="font-medium">{formatSessionDateTime(s.starts_at, s.timezone)}</p>
                      <p className="text-sm text-walnut">
                        {FORMAT_LABELS[s.format]} · {booked}/{capacity} booked
                        {cancelled && " · cancelled"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      {!cancelled && (s.format === "in_person" || s.format === "hybrid") && (
                        <Link
                          href={`/host/classes/${klass.id}/sessions/${s.id}/prep`}
                          className="text-sm text-walnut transition-colors hover:text-iron"
                        >
                          Prep sheet
                        </Link>
                      )}
                      {!cancelled && (
                        (() => {
                          const recap = recapBySession.get(s.id);
                          return (
                            <Link
                              href={`/host/classes/${klass.id}/sessions/${s.id}/recap`}
                              className="text-sm text-walnut transition-colors hover:text-iron"
                            >
                              {recap ? (recap.published_at ? "Recap ✓" : "Recap (draft)") : "Write recap"}
                            </Link>
                          );
                        })()
                      )}
                      {!cancelled && !isPast && (
                        <>
                          <Link
                            href={`/host/classes/${klass.id}/sessions/${s.id}`}
                            className="text-sm text-walnut transition-colors hover:text-iron"
                          >
                            Edit
                          </Link>
                          <CancelSessionButton classId={klass.id} sessionId={s.id} />
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-12 border-t border-line pt-8">
        <h2 className="font-display text-2xl">Class details</h2>
        <div className="mt-4">
          <ClassForm klass={klass} userId={user.id} />
        </div>
      </section>
    </PageShell>
  );
}
