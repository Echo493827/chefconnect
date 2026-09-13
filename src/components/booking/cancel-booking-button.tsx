"use client";

import { useState, useTransition } from "react";
import { cancelBooking } from "@/lib/booking/actions";

// Cancel a booking. The database enforces the cutoff, so if it's too late the
// action simply does nothing and the page reload shows it's still booked.
export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-walnut transition-colors hover:text-paprika"
      >
        Cancel booking
      </button>
    );
  }

  return (
    <span className="flex items-center gap-3 text-sm">
      <span className="text-walnut">Cancel this booking?</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => void cancelBooking(bookingId))}
        className="rounded bg-paprika px-3 py-1 font-medium text-cream transition-colors hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Cancelling…" : "Yes, cancel"}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-walnut hover:text-iron">
        Keep it
      </button>
    </span>
  );
}
