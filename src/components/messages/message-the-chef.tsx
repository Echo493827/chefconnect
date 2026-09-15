"use client";

import { useTransition } from "react";
import { startThread } from "@/lib/messages/actions";

// Button on a class page. Starts (or reopens) a thread with the chef about the
// class and navigates to it.
export function MessageTheChef({ classId, chefName }: { classId: string; chefName: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => void startThread(classId))}
      className="rounded border border-line bg-cream px-4 py-2 text-sm font-medium text-iron transition-colors hover:border-walnut disabled:opacity-60"
    >
      {pending ? "Opening…" : `Ask ${chefName} a question`}
    </button>
  );
}
