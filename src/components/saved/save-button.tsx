"use client";

import { useState, useTransition } from "react";
import { toggleSave } from "@/lib/saved/actions";

// Heart toggle. `overlay` styles it for sitting on a card image; otherwise it's
// a standalone button (e.g., on the class page). Optimistic for snappiness.
export function SaveButton({
  classId,
  saved,
  overlay = false,
  withLabel = false,
}: {
  classId: string;
  saved: boolean;
  overlay?: boolean;
  withLabel?: boolean;
}) {
  const [isSaved, setIsSaved] = useState(saved);
  const [pending, start] = useTransition();

  function onClick(e: React.MouseEvent) {
    e.preventDefault(); // don't trigger the surrounding card link
    e.stopPropagation();
    const next = !isSaved;
    setIsSaved(next);
    start(() => void toggleSave(classId, !next));
  }

  if (overlay) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={isSaved}
        aria-label={isSaved ? "Remove from saved" : "Save"}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-flour/90 text-lg shadow-sm transition-colors hover:bg-flour"
      >
        <span className={isSaved ? "text-paprika" : "text-walnut"}>{isSaved ? "♥" : "♡"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={isSaved}
      className="inline-flex items-center gap-2 rounded border border-line bg-cream px-4 py-2 text-sm font-medium text-iron transition-colors hover:border-walnut disabled:opacity-60"
    >
      <span className={isSaved ? "text-paprika" : "text-walnut"}>{isSaved ? "♥" : "♡"}</span>
      {withLabel && (isSaved ? "Saved" : "Save")}
    </button>
  );
}
