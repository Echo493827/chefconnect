"use client";

import { useTransition } from "react";
import { publishClass, unpublishClass, archiveClass } from "@/lib/chef/actions";

// The chef's own publish controls. What's shown depends on the class's current
// status; each button says exactly what it does.
export function PublishControls({ classId, status }: { classId: string; status: string }) {
  const [pending, startTransition] = useTransition();

  function run(fn: (id: string) => Promise<void>) {
    startTransition(() => {
      void fn(classId);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {status !== "published" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(publishClass)}
          className="rounded bg-olive px-4 py-2 font-medium text-cream transition-colors hover:bg-olive-deep disabled:opacity-60"
        >
          {pending ? "Working…" : "Publish"}
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(unpublishClass)}
          className="rounded border border-line bg-cream px-4 py-2 font-medium text-iron transition-colors hover:border-walnut disabled:opacity-60"
        >
          {pending ? "Working…" : "Switch to draft"}
        </button>
      )}

      {status !== "archived" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(archiveClass)}
          className="rounded border border-line bg-cream px-4 py-2 text-walnut transition-colors hover:border-paprika hover:text-paprika disabled:opacity-60"
        >
          Archive
        </button>
      )}
    </div>
  );
}
