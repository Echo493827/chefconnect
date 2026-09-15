"use client";

import { useFormState } from "react-dom";
import { submitReview, updateReview, type FormState } from "@/lib/reviews/actions";
import { StarInput } from "@/components/reviews/star-input";
import { SubmitButton } from "@/components/auth/submit-button";
import { fieldClass, labelClass } from "@/components/auth/form-styles";

const initialState: FormState = { error: null, message: null };

export function ReviewForm({
  bookingId,
  reviewId,
  defaultRating,
  defaultBody,
}: {
  bookingId: string;
  reviewId?: string;
  defaultRating?: number;
  defaultBody?: string;
}) {
  const editing = Boolean(reviewId);
  const action = editing ? updateReview.bind(null, reviewId!) : submitReview.bind(null, bookingId);
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <span className={labelClass}>Your rating</span>
        <div className="mt-1.5">
          <StarInput name="rating" defaultValue={defaultRating ?? 0} />
        </div>
      </div>

      <div>
        <label htmlFor="body" className={labelClass}>
          Your review <span className="text-walnut/60">(optional)</span>
        </label>
        <textarea
          id="body"
          name="body"
          rows={5}
          maxLength={3000}
          defaultValue={defaultBody ?? ""}
          placeholder="What was the class like? What did you make, and how was the teaching?"
          className={`${fieldClass} resize-y`}
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-paprika">
          {state.error}
        </p>
      )}

      <SubmitButton pendingLabel={editing ? "Saving…" : "Posting your review…"}>
        {editing ? "Save review" : "Post review"}
      </SubmitButton>
    </form>
  );
}
