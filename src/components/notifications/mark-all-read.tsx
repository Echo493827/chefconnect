"use client";

import { useTransition } from "react";
import { markAllNotificationsRead } from "@/lib/notifications/actions";

export function MarkAllRead() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => void markAllNotificationsRead())}
      className="text-sm text-walnut underline decoration-line underline-offset-2 hover:text-iron disabled:opacity-60"
    >
      {pending ? "Marking…" : "Mark all read"}
    </button>
  );
}
