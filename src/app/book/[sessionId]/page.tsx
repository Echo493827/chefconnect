import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BookingForm } from "@/components/booking/booking-form";
import { WaitlistButton } from "@/components/booking/waitlist-button";
import { PageShell } from "@/components/ui";
import { formatSessionDateTime, seatsLeftLabel } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Book a session" };

const FORMAT_LABELS: Record<string, string> = { in_person: "In person", virtual: "Online", hybrid: "In person or online" };

export default async function BookPage({ params }: { params: { sessionId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/book/${params.sessionId}`);

  // RLS lets a signed-in person read a scheduled session of a published class.
  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, class_id, format, starts_at, timezone, status, inperson_capacity, virtual_capacity, inperson_booked, virtual_booked, locations(city, neighborhood), classes(title, slug, chef_profile_id, chef_profiles(slug, business_name, user_id))",
    )
    .eq("id", params.sessionId)
    .maybeSingle();

  if (!session || session.status !== "scheduled") notFound();

  const klass = Array.isArray(session.classes) ? session.classes[0] : session.classes;
  const chef = klass ? (Array.isArray(klass.chef_profiles) ? klass.chef_profiles[0] : klass.chef_profiles) : null;
  const loc = Array.isArray(session.locations) ? session.locations[0] : session.locations;
  if (!klass || !chef) notFound();

  const backHref = `/chefs/${chef.slug}/${klass.slug}`;
  const when = formatSessionDateTime(session.starts_at, session.timezone);
  const isPast = new Date(session.starts_at).getTime() <= Date.now();

  const summaryLine = (
    <p className="mt-2 text-walnut">
      {klass.title} · {when} · {FORMAT_LABELS[session.format]}
      {loc ? ` in ${[loc.neighborhood, loc.city].filter(Boolean).join(", ")}` : ""}
    </p>
  );

  function Frame({ children }: { children: React.ReactNode }) {
    return (
      <PageShell>
        <Link href={backHref} className="text-sm text-walnut hover:text-iron">
          ← {klass!.title}
        </Link>
        <h1 className="mt-3 font-display text-4xl tracking-tight">Book this session</h1>
        {summaryLine}
        <div className="mt-8">{children}</div>
      </PageShell>
    );
  }

  // The chef can't book their own class.
  if (chef.user_id === user.id) {
    return (
      <Frame>
        <p className="rounded border border-line bg-cream/60 p-4 text-walnut">This is your class, so you can&rsquo;t book it.</p>
      </Frame>
    );
  }

  if (isPast) {
    return (
      <Frame>
        <p className="rounded border border-line bg-cream/60 p-4 text-walnut">This session has already taken place.</p>
      </Frame>
    );
  }

  // Already have a live booking for this session?
  const { data: existing } = await supabase
    .from("bookings")
    .select("id")
    .eq("session_id", session.id)
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .maybeSingle();
  if (existing) {
    return (
      <Frame>
        <div className="rounded border border-olive/30 bg-olive/10 p-4">
          <p className="text-olive-deep">You&rsquo;re already booked for this session.</p>
          <Link href="/bookings" className="mt-2 inline-block text-sm underline decoration-line underline-offset-2 hover:decoration-walnut">
            See it in your bookings →
          </Link>
        </div>
      </Frame>
    );
  }

  const inpersonLeft =
    session.format === "in_person" || session.format === "hybrid"
      ? Math.max(0, session.inperson_capacity - session.inperson_booked)
      : 0;
  const virtualLeft =
    session.format === "virtual" || session.format === "hybrid"
      ? Math.max(0, session.virtual_capacity - session.virtual_booked)
      : 0;
  const inpersonAvailable = inpersonLeft > 0;
  const virtualAvailable = virtualLeft > 0;

  if (!inpersonAvailable && !virtualAvailable) {
    const { data: wl } = await supabase
      .from("waitlist_entries")
      .select("id")
      .eq("session_id", session.id)
      .eq("user_id", user.id)
      .maybeSingle();
    // seat type to waitlist for: the type this session actually offers
    const waitSeat = session.format === "virtual" ? "virtual" : "in_person";
    return (
      <Frame>
        <WaitlistButton sessionId={session.id} seatType={waitSeat} onWaitlist={Boolean(wl)} />
        <Link href={backHref} className="mt-3 inline-block text-sm underline decoration-line underline-offset-2 hover:decoration-walnut">
          See other dates
        </Link>
      </Frame>
    );
  }

  // Current waiver text to display and record acceptance against.
  const { data: waiver } = await supabase
    .from("waivers")
    .select("version, title, body")
    .eq("is_current", true)
    .maybeSingle();
  if (!waiver) {
    return (
      <Frame>
        <p className="rounded border border-paprika/30 bg-paprika/5 p-4 text-paprika">
          Booking is briefly unavailable. Please try again shortly.
        </p>
      </Frame>
    );
  }

  const seatsNote =
    session.format === "hybrid"
      ? `${seatsLeftLabel(session.inperson_booked, session.inperson_capacity)} in person · ${seatsLeftLabel(session.virtual_booked, session.virtual_capacity)} online`
      : session.format === "in_person"
        ? seatsLeftLabel(session.inperson_booked, session.inperson_capacity)
        : seatsLeftLabel(session.virtual_booked, session.virtual_capacity);

  return (
    <Frame>
      <p className="-mt-4 mb-6 text-sm text-walnut">{seatsNote}</p>
      <BookingForm
        sessionId={session.id}
        format={session.format}
        waiverVersion={waiver.version}
        waiverTitle={waiver.title}
        waiverBody={waiver.body}
        inpersonLeft={inpersonLeft}
        virtualLeft={virtualLeft}
      />
    </Frame>
  );
}
