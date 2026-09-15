"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fieldClass, labelClass } from "@/components/auth/form-styles";

// Sets a new password for the signed-in (or recovery) session.
export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setStatus("saving");
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setStatus("idle");
      setError("Couldn't update your password. Your reset link may have expired — request a new one.");
      return;
    }
    setStatus("done");
    router.push("/account");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="password" className={labelClass}>
          New password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="confirm" className={labelClass}>
          Confirm new password
        </label>
        <input
          id="confirm"
          type="password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={fieldClass}
        />
      </div>
      {error && <p className="text-sm text-paprika">{error}</p>}
      <button
        type="submit"
        disabled={status === "saving" || status === "done"}
        className="w-full rounded bg-olive px-4 py-2.5 font-medium text-cream transition-colors hover:bg-olive-deep disabled:opacity-60"
      >
        {status === "saving" ? "Saving…" : status === "done" ? "Saved" : "Update password"}
      </button>
    </form>
  );
}
