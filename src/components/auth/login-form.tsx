"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { signIn, type AuthFormState } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { fieldClass, labelClass } from "@/components/auth/form-styles";

const initialState: AuthFormState = { error: null, message: null };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useFormState(signIn, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />

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
          autoComplete="current-password"
          required
          className={fieldClass}
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-paprika">
          {state.error}
        </p>
      )}

      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>

      <p className="text-sm text-walnut">
        New to ChefConnect?{" "}
        <Link href="/signup" className="text-iron underline decoration-line underline-offset-2 hover:decoration-walnut">
          Create an account
        </Link>
      </p>
    </form>
  );
}
