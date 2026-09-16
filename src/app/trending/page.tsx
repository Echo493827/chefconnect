import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ClassCard } from "@/components/search/class-card";
import { savedClassIds } from "@/lib/saved/get-saved";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Trending classes",
  description: "The cooking classes people are booking most right now.",
};

export default async function TrendingPage() {
  const supabase = createClient();
  const { data: results } = await supabase.rpc("trending_classes", { p_limit: 24 });
  const list = results ?? [];
  const saved = await savedClassIds(list.map((r) => r.class_id));

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pb-24 pt-10">
      <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Trending now</h1>
      <p className="mt-2 max-w-prose text-walnut">
        The classes people are booking most right now. Fresh dates, filling fast.
      </p>

      <section className="mt-8">
        {list.length === 0 ? (
          <div className="rounded border border-dashed border-line bg-cream/60 px-6 py-12 text-center">
            <p className="font-display text-xl">Nothing trending yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-walnut">
              As classes get booked, the most popular ones will show up here.{" "}
              <Link href="/" className="underline decoration-line underline-offset-2 hover:decoration-walnut">
                Browse all classes
              </Link>
              .
            </p>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((r) => (
              <li key={r.class_id}>
                <ClassCard result={r} saved={saved.has(r.class_id) ? true : undefined} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
