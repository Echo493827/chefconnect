// Read-only star display. Fills to the nearest whole star.
export function Stars({ value, className = "" }: { value: number; className?: string }) {
  const filled = Math.round(value);
  return (
    <span className={`inline-flex ${className}`} aria-label={`${value} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} aria-hidden="true" className={n <= filled ? "text-turmeric" : "text-line"}>
          ★
        </span>
      ))}
    </span>
  );
}

// Compact aggregate, e.g. "★ 4.2 · 12 reviews". Renders nothing when there are
// no reviews yet so we never show a hollow "0.0".
export function RatingSummary({
  average,
  count,
  className = "",
}: {
  average: number;
  count: number;
  className?: string;
}) {
  if (!count) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span aria-hidden="true" className="text-turmeric">
        ★
      </span>
      <span className="font-medium text-iron">{average.toFixed(1)}</span>
      <span className="text-walnut">
        · {count} {count === 1 ? "review" : "reviews"}
      </span>
    </span>
  );
}
