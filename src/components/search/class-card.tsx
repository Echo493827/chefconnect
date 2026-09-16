import Link from "next/link";
import Image from "next/image";
import { formatDuration, formatSessionDateTime } from "@/lib/format";
import { SKILL_LEVEL_LABELS } from "@/components/chef/chef-type";
import { SaveButton } from "@/components/saved/save-button";
import type { Database } from "@/lib/database.types";

type Result = Database["public"]["Functions"]["search_classes"]["Returns"][number];

const FORMAT_LABELS: Record<string, string> = { in_person: "In person", virtual: "Online", hybrid: "In person + online" };

export function ClassCard({ result, saved }: { result: Result; saved?: boolean }) {
  const price = result.price_cents === 0 ? "Free" : `$${(result.price_cents / 100).toFixed(2)}`;
  const area =
    result.next_format === "virtual"
      ? "Online"
      : [result.neighborhood, result.city].filter(Boolean).join(", ") || null;
  const seats = result.seats_left <= 0 ? "Full" : result.seats_left === 1 ? "1 seat left" : `${result.seats_left} seats left`;

  return (
    <Link
      href={`/chefs/${result.chef_slug}/${result.class_slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-cream/60 transition-colors hover:border-walnut"
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-flour">
        {result.cover_image_url ? (
          <Image
            src={result.cover_image_url}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover"
          />
        ) : (
          // No photo yet: a warm block with the cuisine, so cards still read well.
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-flour to-line">
            <span className="font-display text-2xl text-walnut/50">{result.cuisine}</span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-sm bg-iron/80 px-2 py-0.5 text-xs font-medium text-cream">{price}</span>
        {saved !== undefined && <SaveButton classId={result.class_id} saved={saved} overlay />}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs text-walnut">
          {result.cuisine} · {SKILL_LEVEL_LABELS[result.skill_level]} · {formatDuration(result.duration_minutes)}
        </p>
        <h3 className="mt-1 font-display text-xl leading-snug">{result.title}</h3>
        {result.chef_name && <p className="mt-0.5 text-sm text-walnut">with {result.chef_name}</p>}

        <div className="mt-auto pt-3 text-sm">
          <p className="font-medium text-iron">{formatSessionDateTime(result.next_starts_at, result.next_timezone)}</p>
          <p className="mt-0.5 text-walnut">
            {FORMAT_LABELS[result.next_format]}
            {area && result.next_format !== "virtual" ? ` · ${area}` : ""}
            {" · "}
            {seats}
            {result.session_count > 1 ? ` · +${result.session_count - 1} more date${result.session_count > 2 ? "s" : ""}` : ""}
          </p>
        </div>
      </div>
    </Link>
  );
}
