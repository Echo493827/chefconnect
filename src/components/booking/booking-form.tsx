"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { createBooking, type FormState } from "@/lib/booking/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import type { Database } from "@/lib/database.types";

type SeatType = Database["public"]["Enums"]["seat_type"];

const initialState: FormState = { error: null };

export function BookingForm({
  sessionId,
  format,
  waiverVersion,
  waiverTitle,
  waiverBody,
  inpersonLeft,
  virtualLeft,
}: {
  sessionId: string;
  format: Database["public"]["Enums"]["session_format"];
  waiverVersion: string;
  waiverTitle: string;
  waiverBody: string;
  inpersonLeft: number;
  virtualLeft: number;
}) {
  const inpersonAvailable = inpersonLeft > 0;
  const virtualAvailable = virtualLeft > 0;
  const action = createBooking.bind(null, sessionId);
  const [state, formAction] = useFormState(action, initialState);

  // Hybrid sessions let the attendee choose; otherwise the seat type is fixed.
  const onlyOption: SeatType | null =
    format === "in_person" ? "in_person" : format === "virtual" ? "virtual" : null;
  const [seat, setSeat] = useState<SeatType>(onlyOption ?? (inpersonAvailable ? "in_person" : "virtual"));
  const [quantity, setQuantity] = useState(1);
  const maxSeats = Math.min(10, seat === "in_person" ? inpersonLeft : virtualLeft) || 1;
  const cappedQty = Math.min(quantity, maxSeats);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="waiver_version" value={waiverVersion} />

      {onlyOption ? (
        <input type="hidden" name="seat_type" value={onlyOption} />
      ) : (
        <fieldset>
          <legend className="text-sm font-medium text-iron">How would you like to attend?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <label
              className={`cursor-pointer rounded border px-4 py-2.5 text-sm transition-colors ${
                seat === "in_person" ? "border-olive bg-olive/10 text-olive-deep" : "border-line bg-cream text-walnut hover:border-walnut"
              } ${!inpersonAvailable ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <input
                type="radio"
                name="seat_type"
                value="in_person"
                checked={seat === "in_person"}
                disabled={!inpersonAvailable}
                onChange={() => setSeat("in_person")}
                className="sr-only"
              />
              In person{!inpersonAvailable ? " (full)" : ""}
            </label>
            <label
              className={`cursor-pointer rounded border px-4 py-2.5 text-sm transition-colors ${
                seat === "virtual" ? "border-olive bg-olive/10 text-olive-deep" : "border-line bg-cream text-walnut hover:border-walnut"
              } ${!virtualAvailable ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <input
                type="radio"
                name="seat_type"
                value="virtual"
                checked={seat === "virtual"}
                disabled={!virtualAvailable}
                onChange={() => setSeat("virtual")}
                className="sr-only"
              />
              Online{!virtualAvailable ? " (full)" : ""}
            </label>
          </div>
        </fieldset>
      )}

      <div>
        <label htmlFor="quantity" className="block text-sm font-medium text-iron">
          How many seats?
        </label>
        <div className="mt-1.5 flex items-center gap-3">
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            max={maxSeats}
            value={cappedQty}
            onChange={(e) => setQuantity(Math.max(1, Math.min(maxSeats, Number(e.target.value) || 1)))}
            className="w-20 rounded border border-line bg-cream px-3 py-2 text-sm"
          />
          <span className="text-sm text-walnut">{maxSeats} available</span>
        </div>
      </div>

      <div>
        <label htmlFor="dietary_notes" className="block text-sm font-medium text-iron">
          Allergies or dietary needs? <span className="font-normal text-walnut/60">(optional, shared with the chef)</span>
        </label>
        <textarea
          id="dietary_notes"
          name="dietary_notes"
          rows={2}
          maxLength={1000}
          placeholder="e.g. one nut allergy; two vegetarians"
          className="mt-1.5 block w-full rounded border border-line bg-cream px-3 py-2 text-sm"
        />
      </div>

      <div>
        <p className="text-sm font-medium text-iron">{waiverTitle}</p>
        <div className="mt-2 max-h-48 overflow-y-auto rounded border border-line bg-cream/60 p-4 text-sm leading-relaxed text-walnut">
          <p className="whitespace-pre-line">{waiverBody}</p>
        </div>
      </div>

      <label className="flex items-start gap-3">
        <input type="checkbox" name="accept_waiver" className="mt-1 h-4 w-4 accent-olive" />
        <span className="text-sm text-iron">I have read and agree to the waiver above.</span>
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-paprika">
          {state.error}
        </p>
      )}

      <SubmitButton pendingLabel="Booking your seat…">Confirm booking</SubmitButton>
      <p className="text-xs text-walnut">
        The exact location{format === "in_person" ? "" : " or join link"} is shared with you as soon as you book.
      </p>
    </form>
  );
}
