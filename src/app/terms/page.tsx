import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-prose px-6 pb-24 pt-12">
      <h1 className="font-display text-4xl tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-walnut">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>

      <div className="mt-6 rounded border border-turmeric/40 bg-turmeric/10 px-4 py-3 text-sm text-iron">
        Placeholder terms. Replace this with language reviewed by a lawyer before you open to the public.
      </div>

      <div className="mt-8 space-y-6 leading-relaxed text-iron">
        <section>
          <h2 className="font-display text-xl">Using ChefConnect</h2>
          <p className="mt-2 text-walnut">
            ChefConnect connects people who want to learn to cook with chefs who host classes. By using the site you agree
            to use it lawfully and respectfully, and to keep your account details accurate.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl">Bookings and cancellations</h2>
          <p className="mt-2 text-walnut">
            When you book a class you agree to the chef&rsquo;s cancellation window shown on the session. Chefs are
            responsible for the classes they host, including safety, accuracy, and honoring confirmed bookings.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl">Content and conduct</h2>
          <p className="mt-2 text-walnut">
            You&rsquo;re responsible for what you post — class details, reviews, messages, and recaps. We may remove content
            or suspend accounts that break these terms or harm the community.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl">Cooking involves risk</h2>
          <p className="mt-2 text-walnut">
            Cooking involves heat, sharp tools, and allergens. You take part at your own risk and accept the participation
            waiver shown at booking. Tell your chef about allergies and dietary needs in advance.
          </p>
        </section>
      </div>
    </main>
  );
}
