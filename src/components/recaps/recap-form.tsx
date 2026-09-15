"use client";

import { useFormState } from "react-dom";
import { saveRecap, type FormState } from "@/lib/recaps/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { fieldClass, labelClass } from "@/components/auth/form-styles";
import { GalleryUpload } from "@/components/media/image-upload";
import { AttachmentsInput } from "@/components/recaps/attachments-input";
import type { Database } from "@/lib/database.types";

type RecapRow = Database["public"]["Tables"]["recaps"]["Row"];

const initialState: FormState = { error: null, message: null };

export function RecapForm({ sessionId, userId, recap }: { sessionId: string; userId: string; recap?: RecapRow | null }) {
  const action = saveRecap.bind(null, sessionId);
  const [state, formAction] = useFormState(action, initialState);

  const attachments = ((recap?.attachments ?? []) as { label: string; url: string }[]) || [];

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label htmlFor="title" className={labelClass}>
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={120}
          defaultValue={recap?.title ?? ""}
          placeholder="What we made together"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="body" className={labelClass}>
          Recap <span className="text-walnut/60">(what you cooked, tips, thanks)</span>
        </label>
        <textarea
          id="body"
          name="body"
          rows={7}
          maxLength={20000}
          defaultValue={recap?.body ?? ""}
          placeholder="Thanks for a great class! Here's what we covered, and a few notes so you can make it again at home…"
          className={`${fieldClass} resize-y`}
        />
      </div>

      <GalleryUpload name="photo_urls" userId={userId} defaultUrls={recap?.photo_urls ?? []} max={12} />

      <AttachmentsInput name="attachments" defaultValue={attachments} />

      <label className="flex items-start gap-3 rounded border border-line bg-cream/50 p-4">
        <input type="checkbox" name="publish" defaultChecked={Boolean(recap?.published_at)} className="mt-1 h-4 w-4 accent-olive" />
        <span className="text-sm">
          Share with attendees
          <span className="block text-walnut/70">
            When on, everyone who booked this session can see the recap. When off, it stays a private draft.
          </span>
        </span>
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-paprika">
          {state.error}
        </p>
      )}

      <SubmitButton pendingLabel="Saving…">{recap ? "Save recap" : "Create recap"}</SubmitButton>
    </form>
  );
}
