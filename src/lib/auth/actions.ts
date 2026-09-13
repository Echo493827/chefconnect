"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/auth/redirects";

// Shape shared by every auth form: at most one of these is set at a time.
export type AuthFormState = {
  error: string | null;
  message: string | null;
};

function friendly(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return "That email and password don't match an account. Check them and try again.";
  }
  if (/already registered/i.test(message)) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (/rate limit|too many/i.test(message)) {
    return "Too many attempts for now. Wait a minute, then try again.";
  }
  if (/fetch failed|network/i.test(message)) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  return message;
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = sanitizeNextPath(formData.get("next"));

  if (!email || !password) {
    return { error: "Enter your email and password.", message: null };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: friendly(error.message), message: null };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (displayName.length < 1 || displayName.length > 80) {
    return { error: "Pick a display name between 1 and 80 characters.", message: null };
  }
  if (!email) {
    return { error: "Enter your email.", message: null };
  }
  if (password.length < 8) {
    return { error: "Use a password of at least 8 characters.", message: null };
  }

  const supabase = createClient();
  // display_name lands in auth metadata; the database trigger reads it and
  // creates the public profile row automatically.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });

  if (error) {
    return { error: friendly(error.message), message: null };
  }

  // With email confirmation ON, Supabase returns a placeholder user with no
  // identities when the email is already taken, instead of an error.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { error: "An account with this email already exists. Sign in instead.", message: null };
  }

  if (data.session) {
    // Email confirmation is off: they're signed in right now.
    revalidatePath("/", "layout");
    redirect("/account");
  }

  return {
    error: null,
    message: "Almost there — check your email and open the confirmation link to finish creating your account.",
  };
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateProfile(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (displayName.length < 1 || displayName.length > 80) {
    return { error: "Display name must be between 1 and 80 characters.", message: null };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const { error } = await supabase.from("users").update({ display_name: displayName }).eq("id", user.id);
  if (error) {
    return { error: "Couldn't save that right now. Try again in a moment.", message: null };
  }

  revalidatePath("/", "layout");
  return { error: null, message: "Saved." };
}
