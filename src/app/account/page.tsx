import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { signOut } from "@/lib/auth/actions";
import { ProfileForm } from "@/components/account/profile-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Your account" };

const roleLabel: Record<string, string> = {
  attendee: "Member",
  chef: "Chef",
  admin: "Admin",
};

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const memberSince = profile
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <main className="mx-auto w-full max-w-md px-6 pb-24 pt-16">
      <h1 className="font-display text-4xl tracking-tight">Your account</h1>
      <p className="mt-2 text-walnut">
        {user.email}
        {profile && (
          <>
            {" · "}
            {roleLabel[profile.role] ?? profile.role}
          </>
        )}
        {memberSince && <> · joined {memberSince}</>}
      </p>

      <section className="mt-10" aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="font-display text-2xl">
          Profile
        </h2>
        <div className="mt-4">
          <ProfileForm initialDisplayName={profile?.display_name ?? ""} />
        </div>
      </section>

      <section className="mt-12 flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <Link
          href="/account/password"
          className="rounded border border-line bg-cream px-4 py-2 text-walnut transition-colors hover:border-walnut hover:text-iron"
        >
          Change password
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded border border-line bg-cream px-4 py-2 text-walnut transition-colors hover:border-walnut hover:text-iron"
          >
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
