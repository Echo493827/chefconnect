import { runFoundationCheck, type CheckStatus } from "@/lib/foundation-check";

export const dynamic = "force-dynamic";

const statusLabel: Record<CheckStatus, string> = {
  ok: "Passed",
  problem: "Needs attention",
  skipped: "Skipped",
};

const dotClass: Record<CheckStatus, string> = {
  ok: "bg-olive",
  problem: "bg-paprika",
  skipped: "bg-line",
};

export default async function HomePage() {
  const report = await runFoundationCheck();
  const firstProblem = report.checks.find((c) => c.status === "problem");
  const checkedAt = new Date(report.checkedAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  });

  return (
    <main className="mx-auto max-w-prose px-6 pb-24 pt-20 sm:pt-28">
      <h1 className="font-display text-5xl leading-none tracking-tight sm:text-6xl">ChefConnect</h1>
      <p className="mt-5 max-w-md text-lg leading-relaxed text-walnut">
        Cooking classes taught by the people who cook. In home kitchens, restaurant back rooms, and on screen.
      </p>

      <section className="mt-16" aria-labelledby="foundation">
        <h2 id="foundation" className="font-display text-2xl">
          Foundation check
        </h2>
        <p className="mt-2 text-walnut">
          {report.ok
            ? "Everything the first feature depends on is in place."
            : firstProblem
              ? `Not ready yet. Start with ${firstProblem.name.toLowerCase()}.`
              : "Not ready yet."}
        </p>

        <ul className="mt-6 divide-y divide-line border-y border-line">
          {report.checks.map((check) => (
            <li key={check.name} className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
              <span className="text-walnut">{check.name}</span>
              <span className="flex items-start gap-2.5">
                <span aria-hidden="true" className={`mt-2 h-2 w-2 shrink-0 rounded-full ${dotClass[check.status]}`} />
                <span>
                  <span className="sr-only">{statusLabel[check.status]}. </span>
                  {check.detail}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-sm text-walnut">
          Checked at {checkedAt} Central. The same report is available as JSON at /api/health.
        </p>
      </section>
    </main>
  );
}
