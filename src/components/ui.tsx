// Small shared building blocks so the chef, account, and admin screens share one
// visual language. Server-safe (no client hooks).
import Link from "next/link";

export function PageShell({ children, width = "md" }: { children: React.ReactNode; width?: "sm" | "md" | "lg" }) {
  const max = width === "sm" ? "max-w-md" : width === "lg" ? "max-w-5xl" : "max-w-2xl";
  return <main className={`mx-auto w-full ${max} px-6 pb-24 pt-12`}>{children}</main>;
}

export function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    published: "border-olive/30 bg-olive/10 text-olive-deep",
    draft: "border-line bg-cream text-walnut",
    archived: "border-paprika/30 bg-paprika/10 text-paprika",
  };
  const label: Record<string, string> = { published: "Published", draft: "Draft", archived: "Archived" };
  return (
    <span className={`inline-block rounded-sm border px-2 py-0.5 text-xs ${tone[status] ?? tone.draft}`}>
      {label[status] ?? status}
    </span>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const base = "inline-block rounded px-4 py-2.5 font-medium transition-colors";
  const styles =
    variant === "primary"
      ? "bg-olive text-cream hover:bg-olive-deep"
      : "border border-line bg-cream text-iron hover:border-walnut";
  return (
    <Link href={href} className={`${base} ${styles}`}>
      {children}
    </Link>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded border border-dashed border-line bg-cream/60 px-6 py-10 text-center">
      <p className="font-display text-xl">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-walnut">{children}</div>}
    </div>
  );
}
