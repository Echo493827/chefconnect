"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { respondToReview, type FormState } from "@/lib/reviews/actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FormState = { error: null, message: null };

// Inline chef response: opens a small textarea to reply to (or update a reply on)
// one review.
export function RespondForm({ reviewId, existing }: { reviewId: string; existing?: string | null }) {
  const [open, setOpen] = useState(false);
  const action = respondToReview.bind(null, reviewId);
  const [state, formAction] = useFormState(action, initialState);

  if (state.message && !open) {
    return <p className="text-sm text-olive">{state.message}</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-walnut underline decoration-line underline-offset-2 hover:text-iron"
      >
        {existing ? "Edit your response" : "Respond"}
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <textarea
        name="chef_response"
        rows={3}
        maxLength={2000}
        defaultValue={existing ?? ""}
        placeholder="Thank them, answer a question, or share what's next."
        className="block w-full rounded border border-line bg-cream px-3 py-2 text-sm"
      />
      {state.error && (
        <p role="alert" className="text-sm text-paprika">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Posting…">Post response</SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-walnut hover:text-iron">
          Cancel
        </button>
      </div>
    </form>
  );
}
