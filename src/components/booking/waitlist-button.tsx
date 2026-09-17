"use client";

import { useTransition } from "react";
import { joinWaitlist, leaveWaitlist } from "@/lib/waitlist/actions";
import type { Database } from "@/lib/database.types";

type SeatType = Database["public"]["Enums"]["seat_type"];

// When a session is full, join or leave its waitlist.
export function WaitlistButton({
  sessionId,
  seatType,
  onWaitlist,
}: {
  sessionId: string;
  seatType: SeatType;
  onWaitlist: boolean;
}) {
  const [pending, start] = useTransition();

  if (onWaitlist) {
    return (
      <div className="rounded border border-olive/30 bg-olive/10 p-4">
        <p className="text-olive-deep">You&rsquo;re on the waitlist. We&rsquo;ll notify you if a seat opens.</p>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => void leaveWaitlist(sessionId))}
          className="mt-2 text-sm text-walnut underline decoration-line underline-offset-2 hover:text-paprika disabled:opacity-60"
        >
          {pending ? "…" : "Leave the waitlist"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded border border-line bg-cream/60 p-4">
      <p className="text-walnut">This session is full.</p>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => void joinWaitlist(sessionId, seatType))}
        className="mt-2 rounded bg-olive px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-olive-deep disabled:opacity-60"
      >
        {pending ? "Joining…" : "Join the waitlist"}
      </button>
    </div>
  );
}
