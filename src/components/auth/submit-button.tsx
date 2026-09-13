"use client";

import { useFormStatus } from "react-dom";

// Submit button that disables itself and swaps its label while the server
// action runs, so double-clicks can't fire an action twice.
export function SubmitButton({
  children,
  pendingLabel,
}: {
  children: React.ReactNode;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded bg-olive px-4 py-2.5 font-medium text-cream transition-colors hover:bg-olive-deep disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
