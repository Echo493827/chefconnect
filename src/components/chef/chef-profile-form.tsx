"use client";

import { useFormState } from "react-dom";
import { createChefProfile, updateChefProfile, type FormState } from "@/lib/chef/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { fieldClass, labelClass } from "@/components/auth/form-styles";
import { CHEF_TYPE_OPTIONS } from "@/components/chef/chef-type";
import { CoverImageUpload } from "@/components/media/image-upload";
import type { Database } from "@/lib/database.types";

type ChefProfile = Database["public"]["Tables"]["chef_profiles"]["Row"];

const initialState: FormState = { error: null, message: null };

export function ChefProfileForm({ profile, userId }: { profile?: ChefProfile; userId: string }) {
  const editing = Boolean(profile);
  const [state, formAction] = useFormState(editing ? updateChefProfile : createChefProfile, initialState);

  const social = (profile?.social_links ?? {}) as Record<string, string>;

  return (
    <form action={formAction} className="space-y-6">
      <CoverImageUpload name="cover_image_url" userId={userId} defaultUrl={profile?.cover_image_url ?? undefined} label="Cover photo (optional)" />

      <div>
        <label htmlFor="chef_type" className={labelClass}>
          What kind of chef are you?
        </label>
        <select id="chef_type" name="chef_type" defaultValue={profile?.chef_type ?? "home"} className={fieldClass}>
          {CHEF_TYPE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="business_name" className={labelClass}>
          Kitchen or business name <span className="text-walnut/60">(optional)</span>
        </label>
        <input
          id="business_name"
          name="business_name"
          type="text"
          maxLength={120}
          defaultValue={profile?.business_name ?? ""}
          placeholder="e.g. Maria's Kitchen Table"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="headline" className={labelClass}>
          Headline <span className="text-walnut/60">(one line, shown on your classes)</span>
        </label>
        <input
          id="headline"
          name="headline"
          type="text"
          maxLength={140}
          defaultValue={profile?.headline ?? ""}
          placeholder="Southern Italian pasta, made by hand"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="about" className={labelClass}>
          About you <span className="text-walnut/60">(optional)</span>
        </label>
        <textarea
          id="about"
          name="about"
          rows={5}
          maxLength={4000}
          defaultValue={profile?.about ?? ""}
          placeholder="Where you learned to cook, what you love to teach, what a class with you feels like."
          className={`${fieldClass} resize-y`}
        />
      </div>

      <div>
        <label htmlFor="specialties" className={labelClass}>
          Specialties <span className="text-walnut/60">(comma-separated)</span>
        </label>
        <input
          id="specialties"
          name="specialties"
          type="text"
          defaultValue={(profile?.specialties ?? []).join(", ")}
          placeholder="handmade pasta, Sicilian, knife skills"
          className={fieldClass}
        />
      </div>

      <fieldset className="space-y-4 rounded border border-line bg-cream/50 p-4">
        <legend className="px-1 text-sm text-walnut">Links (optional)</legend>
        <div>
          <label htmlFor="website" className={labelClass}>
            Website
          </label>
          <input id="website" name="website" type="url" defaultValue={social.website ?? ""} placeholder="https://" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="instagram" className={labelClass}>
            Instagram
          </label>
          <input id="instagram" name="instagram" type="text" defaultValue={social.instagram ?? ""} placeholder="@handle" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="youtube" className={labelClass}>
            YouTube
          </label>
          <input id="youtube" name="youtube" type="url" defaultValue={social.youtube ?? ""} placeholder="https://youtube.com/@…" className={fieldClass} />
        </div>
      </fieldset>

      {editing && (
        <label className="flex items-center gap-3 rounded border border-line bg-cream/50 p-4">
          <input
            type="checkbox"
            name="is_accepting_bookings"
            defaultChecked={profile?.is_accepting_bookings ?? true}
            className="h-4 w-4 accent-olive"
          />
          <span className="text-sm">
            Accepting bookings
            <span className="block text-walnut/70">Turn this off to pause new bookings without hiding your classes.</span>
          </span>
        </label>
      )}

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

      <SubmitButton pendingLabel={editing ? "Saving…" : "Creating your chef profile…"}>
        {editing ? "Save changes" : "Become a chef"}
      </SubmitButton>
    </form>
  );
}
