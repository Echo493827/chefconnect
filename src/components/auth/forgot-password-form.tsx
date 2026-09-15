"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fieldClass, labelClass } from "@/components/auth/form-styles";

// Sends a password-reset email. The link returns through /auth/callback, which
// establishes a recovery session and forwards to the set-a-new-password page.
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/account/password`,
    });
    setStatus(error ? "error" : "sent");
  }

  if (status === "sent") {
    return (
      <div className="rounded border border-olive/30 bg-olive/10 p-4 text-olive-deep">
        If an account exists for that email, a reset link is on its way. Open it to choose a new password.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={fieldClass}
        />
      </div>
      {status === "error" && <p className="text-sm text-paprika">Something went wrong. Please try again in a moment.</p>}
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded bg-olive px-4 py-2.5 font-medium text-cream transition-colors hover:bg-olive-deep disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
