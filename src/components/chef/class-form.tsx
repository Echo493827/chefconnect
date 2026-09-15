"use client";

import { useFormState } from "react-dom";
import { createClass, updateClass, type FormState } from "@/lib/chef/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { fieldClass, labelClass } from "@/components/auth/form-styles";
import { SKILL_LEVEL_OPTIONS } from "@/components/chef/chef-type";
import { CoverImageUpload, GalleryUpload } from "@/components/media/image-upload";
import type { Database } from "@/lib/database.types";

type ClassRow = Database["public"]["Tables"]["classes"]["Row"];

const initialState: FormState = { error: null, message: null };

export function ClassForm({ klass, userId }: { klass?: ClassRow; userId: string }) {
  const editing = Boolean(klass);
  // For edits, bind the class id into the action; for new classes, use createClass.
  const action = editing ? updateClass.bind(null, klass!.id) : createClass;
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <CoverImageUpload name="cover_image_url" userId={userId} defaultUrl={klass?.cover_image_url ?? undefined} label="Cover photo" />

      <div>
        <label htmlFor="title" className={labelClass}>
          Class title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          minLength={3}
          maxLength={120}
          defaultValue={klass?.title ?? ""}
          placeholder="Hand-rolled orecchiette from scratch"
          className={fieldClass}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="cuisine" className={labelClass}>
            Cuisine
          </label>
          <input
            id="cuisine"
            name="cuisine"
            type="text"
            required
            maxLength={60}
            defaultValue={klass?.cuisine ?? ""}
            placeholder="Southern Italian"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="duration_minutes" className={labelClass}>
            Duration (minutes)
          </label>
          <input
            id="duration_minutes"
            name="duration_minutes"
            type="number"
            required
            min={15}
            max={720}
            step={5}
            defaultValue={klass?.duration_minutes ?? 120}
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="skill_level" className={labelClass}>
          Skill level
        </label>
        <select id="skill_level" name="skill_level" defaultValue={klass?.skill_level ?? "all_levels"} className={fieldClass}>
          {SKILL_LEVEL_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="summary" className={labelClass}>
          Short summary <span className="text-walnut/60">(one or two lines, shown on cards)</span>
        </label>
        <input
          id="summary"
          name="summary"
          type="text"
          maxLength={280}
          defaultValue={klass?.summary ?? ""}
          placeholder="Make three shapes of fresh pasta and a simple sauce to carry them."
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Full description <span className="text-walnut/60">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={6}
          maxLength={8000}
          defaultValue={klass?.description ?? ""}
          placeholder="What you'll cook, how the time is spent, what people leave knowing."
          className={`${fieldClass} resize-y`}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="tags" className={labelClass}>
            Tags <span className="text-walnut/60">(comma-separated)</span>
          </label>
          <input
            id="tags"
            name="tags"
            type="text"
            defaultValue={(klass?.tags ?? []).join(", ")}
            placeholder="date night, knife skills"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="dietary_tags" className={labelClass}>
            Dietary <span className="text-walnut/60">(comma-separated)</span>
          </label>
          <input
            id="dietary_tags"
            name="dietary_tags"
            type="text"
            defaultValue={(klass?.dietary_tags ?? []).join(", ")}
            placeholder="vegetarian, halal, gluten-free"
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="what_you_learn" className={labelClass}>
          What you&rsquo;ll learn <span className="text-walnut/60">(one per line)</span>
        </label>
        <textarea
          id="what_you_learn"
          name="what_you_learn"
          rows={3}
          defaultValue={(klass?.what_you_learn ?? []).join("\n")}
          placeholder={"Make pasta dough by hand\nShape orecchiette with your thumb\nBalance a quick tomato sauce"}
          className={`${fieldClass} resize-y`}
        />
      </div>

      <div>
        <label htmlFor="what_to_bring" className={labelClass}>
          What to bring <span className="text-walnut/60">(one per line, optional)</span>
        </label>
        <textarea
          id="what_to_bring"
          name="what_to_bring"
          rows={2}
          defaultValue={(klass?.what_to_bring ?? []).join("\n")}
          placeholder={"An apron\nA container for leftovers"}
          className={`${fieldClass} resize-y`}
        />
      </div>

      <GalleryUpload name="gallery_urls" userId={userId} defaultUrls={klass?.gallery_urls ?? []} />

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

      <SubmitButton pendingLabel={editing ? "Saving…" : "Creating draft…"}>
        {editing ? "Save changes" : "Create draft"}
      </SubmitButton>
    </form>
  );
}
