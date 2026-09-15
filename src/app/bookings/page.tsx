import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CancelBookingButton } from "@/components/booking/cancel-booking-button";
import { PageShell, EmptyState } from "@/components/ui";
import { formatSessionDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My bookings" };

const FORMAT_LABELS: Record<string, string> = { in_person: "In person", virtual: "Online", hybrid: "In person + online" };

export default async function BookingsPage({ searchParams }: { searchParams: { booked?: string; reviewed?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/bookings");

  const { data: bookingRows } = await supabase
    .from("bookings")
    .select(
      "id, seat_type, status, session_id, sessions(id, starts_at, timezone, format, location_id, classes(title, slug, chef_profiles(slug, business_name)))",
    )
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  const rows = (bookingRows ?? []).filter((b) => b.sessions);

  // Batch-fetch the now-revealed private details for the sessions/locations in
  // these bookings. RLS only returns rows for sessions the viewer has booked.
  const sessionIds = rows.map((b) => b.session_id);
  const locationIds = Array.from(
    new Set(
      rows
        .map((b) => (Array.isArray(b.sessions) ? b.sessions[0] : b.sessions)?.location_id)
        .filter((v): v is string => Boolean(v)),
    ),
  );

  const [{ data: secrets }, { data: addresses }] = await Promise.all([
    sessionIds.length
      ? supabase.from("session_secrets").select("session_id, virtual_join_url").in("session_id", sessionIds)
      : Promise.resolve({ data: [] as { session_id: string; virtual_join_url: string | null }[] }),
    locationIds.length
      ? supabase.from("location_addresses").select("location_id, full_address, arrival_notes").in("location_id", locationIds)
      : Promise.resolve({ data: [] as { location_id: string; full_address: string; arrival_notes: string | null }[] }),
  ]);

  const joinBySession = new Map((secrets ?? []).map((s) => [s.session_id, s.virtual_join_url]));
  const addressByLocation = new Map((addresses ?? []).map((a) => [a.location_id, a]));

  // which of these bookings already have a review, so we show Edit vs Leave
  const bookingIds = rows.map((b) => b.id);
  const { data: reviewRows } = bookingIds.length
    ? await supabase.from("reviews").select("booking_id").in("booking_id", bookingIds)
    : { data: [] as { booking_id: string }[] };
  const reviewedBookingIds = new Set((reviewRows ?? []).map((r) => r.booking_id));

  const now = Date.now();
  const upcoming = rows.filter((b) => {
    const s = Array.isArray(b.sessions) ? b.sessions[0] : b.sessions;
    return s && new Date(s.starts_at).getTime() > now;
  });
  const past = rows.filter((b) => {
    const s = Array.isArray(b.sessions) ? b.sessions[0] : b.sessions;
    return s && new Date(s.starts_at).getTime() <= now;
  });

  return (
    <PageShell width="lg">
      <h1 className="font-display text-4xl tracking-tight">My bookings</h1>

      {searchParams.reviewed && (
        <p className="mt-4 rounded border border-olive/30 bg-olive/10 px-4 py-3 text-olive-deep">
          Thanks for reviewing — your feedback helps other cooks choose.
        </p>
      )}

      {searchParams.booked && upcoming.length > 0 && (
        <p className="mt-4 rounded border border-olive/30 bg-olive/10 px-4 py-3 text-olive-deep">
          You&rsquo;re booked. The details below — including where to go — are now yours.
        </p>
      )}

      {rows.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No bookings yet">
            When you book a class, it shows up here with everything you need to attend.{" "}
            <Link href="/" className="underline decoration-line underline-offset-2 hover:decoration-walnut">
              Find a class
            </Link>
            .
          </EmptyState>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-2xl">Upcoming</h2>
              <ul className="mt-4 space-y-4">
                {upcoming.map((b) => {
                  const s = Array.isArray(b.sessions) ? b.sessions[0] : b.sessions;
                  if (!s) return null;
                  const klass = Array.isArray(s.classes) ? s.classes[0] : s.classes;
                  const chef = klass ? (Array.isArray(klass.chef_profiles) ? klass.chef_profiles[0] : klass.chef_profiles) : null;
                  const address = s.location_id ? addressByLocation.get(s.location_id) : null;
                  const joinUrl = joinBySession.get(s.id);
                  const isInPerson = b.seat_type === "in_person";
                  return (
                    <li key={b.id} className="rounded border border-line bg-cream/60 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-display text-xl">{klass?.title ?? "Class"}</p>
                          <p className="mt-0.5 text-sm text-walnut">
                            {chef?.business_name ? `with ${chef.business_name} · ` : ""}
                            {formatSessionDateTime(s.starts_at, s.timezone)} · {b.seat_type === "in_person" ? "In person" : "Online"}
                          </p>
                        </div>
                        <CancelBookingButton bookingId={b.id} />
                      </div>

                      <div className="mt-4 rounded border border-line bg-flour px-4 py-3 text-sm">
                        {isInPerson ? (
                          address ? (
                            <>
                              <p className="font-medium text-iron">Where to go</p>
                              <p className="mt-0.5 text-iron">{address.full_address}</p>
                              {address.arrival_notes && <p className="mt-1 text-walnut">{address.arrival_notes}</p>}
                            </>
                          ) : (
                            <p className="text-walnut">Location details will appear here.</p>
                          )
                        ) : joinUrl ? (
                          <>
                            <p className="font-medium text-iron">Join link</p>
                            <a
                              href={joinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-0.5 inline-block break-all text-olive-deep underline decoration-line underline-offset-2"
                            >
                              {joinUrl}
                            </a>
                          </>
                        ) : (
                          <p className="text-walnut">The chef hasn&rsquo;t posted a join link yet — check back before the session.</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {past.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-2xl">Past</h2>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {past.map((b) => {
                  const s = Array.isArray(b.sessions) ? b.sessions[0] : b.sessions;
                  if (!s) return null;
                  const klass = Array.isArray(s.classes) ? s.classes[0] : s.classes;
                  const reviewed = reviewedBookingIds.has(b.id);
                  return (
                    <li key={b.id} className="flex items-center justify-between gap-4 py-4">
                      <div>
                        <p className="font-medium">{klass?.title ?? "Class"}</p>
                        <p className="text-sm text-walnut">
                          {formatSessionDateTime(s.starts_at, s.timezone)} · {FORMAT_LABELS[s.format]}
                        </p>
                      </div>
                      <Link
                        href={`/review/${b.id}`}
                        className="shrink-0 rounded border border-line bg-cream px-3 py-1.5 text-sm text-iron transition-colors hover:border-walnut"
                      >
                        {reviewed ? "Edit review" : "Leave a review"}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </PageShell>
  );
}
