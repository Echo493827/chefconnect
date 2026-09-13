"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { signUp, type AuthFormState } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { fieldClass, labelClass } from "@/components/auth/form-styles";

const initialState: AuthFormState = { error: null, message: null };

export function SignupForm() {
  const [state, formAction] = useFormState(signUp, initialState);

  // Email confirmation is required and the mail is on its way: replace the
  // form so it can't be resubmitted while they wait.
  if (state.message) {
    return (
      <div className="rounded border border-line bg-cream px-5 py-4">
        <p className="font-medium">Check your email</p>
        <p className="mt-1 text-sm leading-relaxed text-walnut">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="display_name" className={labelClass}>
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          autoComplete="name"
          maxLength={80}
          required
          placeholder="How you'll appear to others"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={fieldClass} />
      </div>

      <div>
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={fieldClass}
        />
        <p className="mt-1.5 text-sm text-walnut">At least 8 characters.</p>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-paprika">
          {state.error}
        </p>
      )}

      <SubmitButton pendingLabel="Creating your account…">Create account</SubmitButton>

      <p className="text-sm text-walnut">
        Already have an account?{" "}
        <Link href="/login" className="text-iron underline decoration-line underline-offset-2 hover:decoration-walnut">
          Sign in
        </Link>
      </p>
    </form>
  );
}
