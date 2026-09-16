import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AttendeesList } from "@/components/chef/attendees-list";
import { PageShell, EmptyState } from "@/components/ui";
import { formatSessionDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Attendees" };

export default async function AttendeesPage({ params }: { params: { id: string; sessionId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/host/classes/${params.id}/sessions/${params.sessionId}/attendees`);
  const { data: profile } = await supabase.from("chef_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/host/new");
  const { data: klass } = await supabase.from("classes").select("id, title, chef_profile_id").eq("id", params.id).maybeSingle();
  if (!klass || klass.chef_profile_id !== profile.id) notFound();
  const { data: session } = await supabase.from("sessions").select("id, class_id, starts_at, timezone").eq("id", params.sessionId).maybeSingle();
  if (!session || session.class_id !== klass.id) notFound();

  // RLS lets the chef of the session read its bookings.
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, seat_type, quantity, dietary_notes, status, users(display_name)")
    .eq("session_id", session.id)
    .eq("status", "confirmed")
    .order("created_at", { ascending: true });

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
  const attendees = (bookings ?? []).map((b) => ({
    id: b.id,
    name: one(b.users)?.display_name ?? "Guest",
    seatType: b.seat_type,
    quantity: b.quantity,
    dietaryNotes: b.dietary_notes,
  }));
  const totalSeats = attendees.reduce((sum, a) => sum + a.quantity, 0);

  return (
    <PageShell>
      <Link href={`/host/classes/${klass.id}`} className="text-sm text-walnut hover:text-iron">
        ← {klass.title}
      </Link>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Attendees</h1>
      <p className="mt-2 text-walnut">
        {formatSessionDateTime(session.starts_at, session.timezone)} · {totalSeats} {totalSeats === 1 ? "seat" : "seats"} booked
      </p>
      <div className="mt-6">
        {attendees.length === 0 ? (
          <EmptyState title="No bookings yet">When people book this session, they&rsquo;ll appear here with any dietary notes.</EmptyState>
        ) : (
          <AttendeesList attendees={attendees} />
        )}
      </div>
    </PageShell>
  );
}
