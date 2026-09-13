"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormState } from "react-dom";
import { createSession, updateSession, type FormState } from "@/lib/chef/session-actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { fieldClass, labelClass } from "@/components/auth/form-styles";
import type { Database } from "@/lib/database.types";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type SessionFormat = Database["public"]["Enums"]["session_format"];
type LocationOption = { id: string; label: string; city: string };

const initialState: FormState = { error: null, message: null };

const FORMAT_OPTIONS: [SessionFormat, string][] = [
  ["in_person", "In person"],
  ["virtual", "Virtual"],
  ["hybrid", "Hybrid (both)"],
];

// Turn a stored UTC instant into the value a datetime-local input expects,
// rendered in the browser's local zone.
function toLocalInputValue(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SessionForm({
  classId,
  locations,
  session,
  joinUrl,
}: {
  classId: string;
  locations: LocationOption[];
  session?: SessionRow;
  joinUrl?: string;
}) {
  const editing = Boolean(session);
  const action = editing ? updateSession.bind(null, classId, session!.id) : createSession.bind(null, classId);
  const [state, formAction] = useFormState(action, initialState);

  const [format, setFormat] = useState<SessionFormat>(session?.format ?? "in_person");
  const [localStart, setLocalStart] = useState<string>(toLocalInputValue(session?.starts_at));

  const showLocation = format === "in_person" || format === "hybrid";
  const showVirtual = format === "virtual" || format === "hybrid";

  // Convert the wall-clock input to a UTC instant here, where the browser knows
  // its own zone; the server stores that instant plus the zone name below.
  const startIso = localStart ? new Date(localStart).toISOString() : "";
  const browserTz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "America/Chicago";

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="starts_at_iso" value={startIso} />
      <input type="hidden" name="timezone" value={session?.timezone || browserTz} />

      <div>
        <span className={labelClass}>Format</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {FORMAT_OPTIONS.map(([value, label]) => (
            <label
              key={value}
              className={`cursor-pointer rounded border px-3.5 py-2 text-sm transition-colors ${
                format === value ? "border-olive bg-olive/10 text-olive-deep" : "border-line bg-cream text-walnut hover:border-walnut"
              }`}
            >
              <input
                type="radio"
                name="format"
                value={value}
                checked={format === value}
                onChange={() => setFormat(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="starts_at_local" className={labelClass}>
          Date and time
        </label>
        <input
          id="starts_at_local"
          type="datetime-local"
          required
          value={localStart}
          onChange={(e) => setLocalStart(e.target.value)}
          className={fieldClass}
        />
        <p className="mt-1.5 text-sm text-walnut">
          End time is set automatically from the class length. Times use your timezone ({session?.timezone || browserTz}).
        </p>
      </div>

      {showLocation && (
        <div className="space-y-4 rounded border border-line bg-cream/50 p-4">
          <div>
            <label htmlFor="location_id" className={labelClass}>
              Location
            </label>
            {locations.length === 0 ? (
              <p className="mt-1.5 text-sm text-walnut">
                You don&rsquo;t have any locations yet.{" "}
                <Link href="/host/locations" className="underline decoration-line underline-offset-2 hover:decoration-walnut">
                  Add one first
                </Link>
                , then come back to schedule an in-person session.
              </p>
            ) : (
              <select
                id="location_id"
                name="location_id"
                defaultValue={session?.location_id ?? ""}
                className={fieldClass}
              >
                <option value="">Choose a location…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label} — {l.city}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label htmlFor="inperson_capacity" className={labelClass}>
              In-person seats
            </label>
            <input
              id="inperson_capacity"
              name="inperson_capacity"
              type="number"
              min={0}
              max={500}
              defaultValue={session?.inperson_capacity || 8}
              className={fieldClass}
            />
          </div>
        </div>
      )}

      {showVirtual && (
        <div className="space-y-4 rounded border border-line bg-cream/50 p-4">
          <div>
            <label htmlFor="virtual_capacity" className={labelClass}>
              Virtual seats
            </label>
            <input
              id="virtual_capacity"
              name="virtual_capacity"
              type="number"
              min={0}
              max={5000}
              defaultValue={session?.virtual_capacity || 20}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="virtual_join_url" className={labelClass}>
              Join link <span className="text-walnut/60">(optional; shown to booked students)</span>
            </label>
            <input
              id="virtual_join_url"
              name="virtual_join_url"
              type="url"
              defaultValue={joinUrl ?? ""}
              placeholder="https://meet.example.com/…"
              className={fieldClass}
            />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="cancellation_cutoff_hours" className={labelClass}>
          Cancellation cutoff (hours before start)
        </label>
        <input
          id="cancellation_cutoff_hours"
          name="cancellation_cutoff_hours"
          type="number"
          min={0}
          max={720}
          defaultValue={session?.cancellation_cutoff_hours ?? 24}
          className={`${fieldClass} max-w-[10rem]`}
        />
        <p className="mt-1.5 text-sm text-walnut">Students can cancel up to this many hours before the session starts.</p>
      </div>

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

      <SubmitButton pendingLabel={editing ? "Saving…" : "Scheduling…"}>
        {editing ? "Save session" : "Schedule session"}
      </SubmitButton>
    </form>
  );
}
