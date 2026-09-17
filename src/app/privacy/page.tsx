import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-prose px-6 pb-24 pt-12">
      <h1 className="font-display text-4xl tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-walnut">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>

      <div className="mt-6 rounded border border-turmeric/40 bg-turmeric/10 px-4 py-3 text-sm text-iron">
        Placeholder policy. Replace this with a reviewed privacy policy before you open to the public.
      </div>

      <div className="mt-8 space-y-6 leading-relaxed text-iron">
        <section>
          <h2 className="font-display text-xl">What we collect</h2>
          <p className="mt-2 text-walnut">
            Your account details (name, email), the classes you create or book, reviews, recaps, messages, and dietary
            notes you choose to share with a chef when booking.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl">How your location is handled</h2>
          <p className="mt-2 text-walnut">
            A class&rsquo;s exact address stays private. The public only sees an approximate neighborhood; the full address is
            shared with you after you book a session there.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl">What friends can see</h2>
          <p className="mt-2 text-walnut">
            If you add friends, they can see the public classes you&rsquo;re going to and any classes you host. They never see
            your exact addresses, payment details, or private messages.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl">Your choices</h2>
          <p className="mt-2 text-walnut">
            You can edit or delete your content, remove friends, and close your account. Contact us to request a copy of
            your data or its deletion.
          </p>
        </section>
      </div>
    </main>
  );
}
