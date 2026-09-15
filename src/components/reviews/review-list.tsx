import { Stars } from "@/components/reviews/stars";

type ReviewItem = {
  id: string;
  rating: number;
  body: string | null;
  chef_response: string | null;
  created_at: string;
  reviewer_name: string | null;
  class_title?: string | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// Shared review list used on class pages, chef profiles, and the chef's own
// reviews screen. Shows the rating, who wrote it, the text, and any chef reply.
export function ReviewList({ reviews }: { reviews: ReviewItem[] }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {reviews.map((r) => (
        <li key={r.id} className="py-5">
          <div className="flex items-center gap-3">
            <Stars value={r.rating} />
            <span className="text-sm text-walnut">
              {r.reviewer_name ?? "Guest"} · {formatDate(r.created_at)}
            </span>
          </div>
          {r.class_title && <p className="mt-1 text-sm text-walnut">on {r.class_title}</p>}
          {r.body && <p className="mt-2 whitespace-pre-line leading-relaxed text-iron">{r.body}</p>}
          {r.chef_response && (
            <div className="mt-3 rounded border border-line bg-cream/60 p-3">
              <p className="text-xs font-medium text-walnut">Response from the chef</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-iron">{r.chef_response}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
