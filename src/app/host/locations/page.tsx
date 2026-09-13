import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LocationForm } from "@/components/chef/location-form";
import { DeleteLocationButton } from "@/components/chef/delete-location-button";
import { PageShell, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Locations" };

export default async function LocationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/host/locations");
  const { data: profile } = await supabase.from("chef_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/host/new");

  const { data: locations } = await supabase
    .from("locations")
    .select("id, label, city, region, neighborhood")
    .eq("chef_profile_id", profile.id)
    .order("created_at", { ascending: true });

  const list = locations ?? [];

  return (
    <PageShell>
      <Link href="/host" className="text-sm text-walnut hover:text-iron">
        ← Back to dashboard
      </Link>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Locations</h1>
      <p className="mt-2 text-walnut">
        Add the places you teach in person. You&rsquo;ll pick one when you schedule an in-person session.
      </p>

      <section className="mt-8">
        {list.length === 0 ? (
          <EmptyState title="No locations yet">Add your first teaching location below.</EmptyState>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {list.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-medium">{l.label}</p>
                  <p className="text-sm text-walnut">
                    {[l.neighborhood, l.city, l.region].filter(Boolean).join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Link href={`/host/locations/${l.id}`} className="text-sm text-walnut transition-colors hover:text-iron">
                    Edit
                  </Link>
                  <DeleteLocationButton locationId={l.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl">Add a location</h2>
        <div className="mt-4">
          <LocationForm />
        </div>
      </section>
    </PageShell>
  );
}
