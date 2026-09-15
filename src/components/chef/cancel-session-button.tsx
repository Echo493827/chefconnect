"use client";

import { useState, useTransition } from "react";
import { cancelSession } from "@/lib/chef/session-actions";

// Cancelling triggers the database cascade: every booking is cancelled, seats
// are freed, and each attendee is notified. We ask for a reason and confirm,
// because this reaches out to real people who booked.
export function CancelSessionButton({ classId, sessionId }: { classId: string; sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-walnut transition-colors hover:text-paprika">
        Cancel
      </button>
    );
  }

  return (
    <form
      action={(formData) => startTransition(() => void cancelSession(classId, sessionId, formData))}
      className="mt-2 space-y-2 rounded border border-paprika/30 bg-paprika/5 p-3"
    >
      <label htmlFor={`reason-${sessionId}`} className="block text-sm text-walnut">
        Reason (shared with anyone booked)
      </label>
      <input
        id={`reason-${sessionId}`}
        name="cancellation_reason"
        type="text"
        maxLength={500}
        placeholder="e.g. I'm unwell, sorry!"
        className="block w-full rounded border border-line bg-cream px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-paprika px-3 py-1.5 text-sm font-medium text-cream transition-colors hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Cancelling…" : "Cancel this session"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded border border-line bg-cream px-3 py-1.5 text-sm">
          Keep it
        </button>
      </div>
    </form>
  );
}
