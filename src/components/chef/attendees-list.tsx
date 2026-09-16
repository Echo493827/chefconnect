// Simple attendee display for a session: name, seats, seat type, and any dietary
// notes they left. Server-safe.
type Attendee = {
  id: string;
  name: string;
  seatType: string;
  quantity: number;
  dietaryNotes: string | null;
};

export function AttendeesList({ attendees }: { attendees: Attendee[] }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {attendees.map((a) => (
        <li key={a.id} className="py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-iron">{a.name}</span>
            <span className="text-sm text-walnut">
              {a.quantity} {a.quantity === 1 ? "seat" : "seats"} · {a.seatType === "in_person" ? "In person" : "Online"}
            </span>
          </div>
          {a.dietaryNotes && (
            <p className="mt-1.5 rounded border border-turmeric/30 bg-turmeric/10 px-3 py-2 text-sm text-iron">
              <span className="font-medium">Dietary:</span> {a.dietaryNotes}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
