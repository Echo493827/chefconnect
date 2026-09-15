"use client";

import { useRef } from "react";
import { useFormState } from "react-dom";
import { sendMessage, type FormState } from "@/lib/messages/actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FormState = { error: null };

// Compose box at the bottom of a thread. Clears on a successful send.
export function MessageComposer({ threadId }: { threadId: string }) {
  const action = sendMessage.bind(null, threadId);
  const [state, formAction] = useFormState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="mt-4 border-t border-line pt-4"
    >
      <label htmlFor="body" className="sr-only">
        Your message
      </label>
      <textarea
        id="body"
        name="body"
        rows={3}
        required
        maxLength={4000}
        placeholder="Write a message…"
        className="block w-full rounded border border-line bg-cream px-3 py-2 text-sm"
      />
      {state.error && (
        <p role="alert" className="mt-1.5 text-sm text-paprika">
          {state.error}
        </p>
      )}
      <div className="mt-2 flex justify-end">
        <SubmitButton pendingLabel="Sending…">Send</SubmitButton>
      </div>
    </form>
  );
}
