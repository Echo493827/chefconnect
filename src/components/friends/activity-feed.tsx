import Link from "next/link";
import Image from "next/image";
import { formatSessionDateTime } from "@/lib/format";
import type { Database } from "@/lib/database.types";

type Activity = Database["public"]["Functions"]["friend_activity"]["Returns"][number];

// The friends activity feed: what friends are going to and hosting.
export function ActivityFeed({ items }: { items: Activity[] }) {
  return (
    <ul className="space-y-3">
      {items.map((a, i) => {
        const verb = a.kind === "hosting" ? "is hosting" : "is going to";
        const dateLabel =
          a.kind === "hosting"
            ? `Next: ${formatSessionDateTime(a.session_starts_at, a.session_timezone)}`
            : formatSessionDateTime(a.session_starts_at, a.session_timezone);
        return (
          <li key={`${a.kind}-${a.class_slug}-${a.actor_id}-${i}`}>
            <Link
              href={`/chefs/${a.chef_slug}/${a.class_slug}`}
              className="flex items-center gap-4 rounded-lg border border-line bg-cream/60 p-3 transition-colors hover:border-walnut"
            >
              <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded bg-flour">
                {a.cover_image_url ? (
                  <Image src={a.cover_image_url} alt="" fill sizes="5rem" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-flour to-line text-xs text-walnut/50">
                    {a.cuisine}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-iron">
                  <span className="font-medium">{a.actor_name}</span> <span className="text-walnut">{verb}</span>{" "}
                  <span className="font-medium">{a.class_title}</span>
                </p>
                <p className="mt-0.5 text-sm text-walnut">{dateLabel}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
