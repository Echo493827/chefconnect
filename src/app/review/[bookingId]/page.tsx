import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReviewForm } from "@/components/reviews/review-form";
import { PageShell } from "@/components/ui";
import { formatSessionDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Write a review" };

export default async function ReviewPage({ params }: { params: { bookingId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/review/${params.bookingId}`);

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, user_id, status, sessions(starts_at, ends_at, timezone, classes(title))")
    .eq("id", params.bookingId)
    .maybeSingle();

  if (!booking || booking.user_id !== user.id) notFound();
  const session = Array.isArray(booking.sessions) ? booking.sessions[0] : booking.sessions;
  const klass = session && (Array.isArray(session.classes) ? session.classes[0] : session.classes);
  if (!session || !klass) notFound();

  const ended = new Date(session.ends_at).getTime() <= Date.now();
  const attended = booking.status === "confirmed" || booking.status === "attended";

  // An existing review for this booking means we're editing.
  const { data: existing } = await supabase
    .from("reviews")
    .select("id, rating, body")
    .eq("booking_id", booking.id)
    .maybeSingle();

  return (
    <PageShell>
      <Link href="/bookings" className="text-sm text-walnut hover:text-iron">
        ← Back to my bookings
      </Link>
      <h1 className="mt-3 font-display text-4xl tracking-tight">{existing ? "Edit your review" : "Write a review"}</h1>
      <p className="mt-2 text-walnut">
        {klass.title} · {formatSessionDateTime(session.starts_at, session.timezone)}
      </p>

      <div className="mt-8">
        {!attended ? (
          <p className="rounded border border-line bg-cream/60 p-4 text-walnut">
            Only attended classes can be reviewed.
          </p>
        ) : !ended && !existing ? (
          <p className="rounded border border-line bg-cream/60 p-4 text-walnut">
            You can write your review once the class has finished. Come back after {formatSessionDateTime(session.ends_at, session.timezone)}.
          </p>
        ) : (
          <ReviewForm
            bookingId={booking.id}
            reviewId={existing?.id}
            defaultRating={existing?.rating}
            defaultBody={existing?.body ?? undefined}
          />
        )}
      </div>
    </PageShell>
  );
}
