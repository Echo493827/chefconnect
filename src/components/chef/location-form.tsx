"use client";

import { useFormState } from "react-dom";
import { saveLocation, type FormState } from "@/lib/chef/location-actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { fieldClass, labelClass } from "@/components/auth/form-styles";
import type { Database } from "@/lib/database.types";

type LocationRow = Database["public"]["Tables"]["locations"]["Row"];

const initialState: FormState = { error: null, message: null };

export function LocationForm({
  location,
  fullAddress,
  arrivalNotes,
}: {
  location?: LocationRow;
  fullAddress?: string;
  arrivalNotes?: string;
}) {
  const [state, formAction] = useFormState(saveLocation, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {location && <input type="hidden" name="location_id" value={location.id} />}

      <div>
        <label htmlFor="label" className={labelClass}>
          Label <span className="text-walnut/60">(just for you and your students)</span>
        </label>
        <input
          id="label"
          name="label"
          type="text"
          required
          maxLength={80}
          defaultValue={location?.label ?? ""}
          placeholder="My home kitchen"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="full_address" className={labelClass}>
          Full street address
        </label>
        <input
          id="full_address"
          name="full_address"
          type="text"
          required
          defaultValue={fullAddress ?? ""}
          placeholder="123 W Example St, Chicago, IL 60614"
          className={fieldClass}
        />
        <p className="mt-1.5 text-sm text-walnut">
          Kept private. Students only see the neighborhood until they book. Then they get the exact address.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <label htmlFor="city" className={labelClass}>
            City
          </label>
          <input id="city" name="city" type="text" required maxLength={80} defaultValue={location?.city ?? ""} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="region" className={labelClass}>
            State <span className="text-walnut/60">(optional)</span>
          </label>
          <input id="region" name="region" type="text" maxLength={80} defaultValue={location?.region ?? ""} placeholder="IL" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="neighborhood" className={labelClass}>
            Neighborhood <span className="text-walnut/60">(optional)</span>
          </label>
          <input
            id="neighborhood"
            name="neighborhood"
            type="text"
            maxLength={80}
            defaultValue={location?.neighborhood ?? ""}
            placeholder="Lincoln Park"
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="arrival_notes" className={labelClass}>
          Arrival notes <span className="text-walnut/60">(private; shared with booked students)</span>
        </label>
        <textarea
          id="arrival_notes"
          name="arrival_notes"
          rows={2}
          maxLength={1000}
          defaultValue={arrivalNotes ?? ""}
          placeholder="Buzz 3B, street parking on Example St."
          className={`${fieldClass} resize-y`}
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-paprika">
          {state.error}
        </p>
      )}

      <SubmitButton pendingLabel="Finding the address…">{location ? "Save location" : "Add location"}</SubmitButton>
    </form>
  );
}
