import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-6 pb-24 pt-16">
      <h1 className="font-display text-4xl tracking-tight">Reset your password</h1>
      <p className="mt-2 text-walnut">Enter your email and we&rsquo;ll send you a link to set a new one.</p>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
      <p className="mt-4 text-sm text-walnut">
        <Link href="/login" className="underline decoration-line underline-offset-2 hover:text-iron">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
