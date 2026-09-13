"use client";

import { useFormState } from "react-dom";
import { updateProfile, type AuthFormState } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { fieldClass, labelClass } from "@/components/auth/form-styles";

const initialState: AuthFormState = { error: null, message: null };

export function ProfileForm({ initialDisplayName }: { initialDisplayName: string }) {
  const [state, formAction] = useFormState(updateProfile, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="display_name" className={labelClass}>
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          defaultValue={initialDisplayName}
          maxLength={80}
          required
          className={fieldClass}
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-paprika">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-sm text-olive">
          {state.message}
        </p>
      )}

      <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
    </form>
  );
}
