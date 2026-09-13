import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LocationForm } from "@/components/chef/location-form";
import { PageShell } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit location" };

export default async function EditLocationPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/host/locations/${params.id}`);
  const { data: profile } = await supabase.from("chef_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/host/new");

  const { data: location } = await supabase.from("locations").select("*").eq("id", params.id).maybeSingle();
  if (!location || location.chef_profile_id !== profile.id) notFound();

  // The exact address lives in the RLS-guarded private table; the owning chef can read it.
  const { data: address } = await supabase
    .from("location_addresses")
    .select("full_address, arrival_notes")
    .eq("location_id", location.id)
    .maybeSingle();

  return (
    <PageShell>
      <Link href="/host/locations" className="text-sm text-walnut hover:text-iron">
        ← Back to locations
      </Link>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Edit location</h1>
      <div className="mt-8">
        <LocationForm
          location={location}
          fullAddress={address?.full_address ?? ""}
          arrivalNotes={address?.arrival_notes ?? ""}
        />
      </div>
    </PageShell>
  );
}
