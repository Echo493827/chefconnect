// Shared, dependency-free formatting for dates, times, and durations. Times are
// rendered in the timezone stored with each session so everyone sees the same
// local time the chef intended.

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function formatSessionDateTime(iso: string, timeZone: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    });
  } catch {
    return new Date(iso).toLocaleString("en-US");
  }
}

export function seatsLeftLabel(booked: number, capacity: number): string {
  const left = Math.max(capacity - booked, 0);
  if (left === 0) return "Full";
  if (left === 1) return "1 seat left";
  return `${left} seats left`;
}
