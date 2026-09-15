// Where a notification should take the reader when clicked. Built from the
// kind and the ids stashed in `data`, always same-site.
type NotificationData = Record<string, unknown>;

function str(data: NotificationData, key: string): string | null {
  const v = data?.[key];
  return typeof v === "string" && v ? v : null;
}

export function notificationHref(kind: string, data: NotificationData | null): string {
  const d = data ?? {};
  switch (kind) {
    case "booking_confirmed":
    case "session_cancelled":
      return "/bookings";
    case "recap_published": {
      const s = str(d, "session_id");
      return s ? `/recaps/${s}` : "/bookings";
    }
    case "booking_received":
    case "booking_cancelled": {
      const c = str(d, "class_id");
      return c ? `/host/classes/${c}` : "/host";
    }
    default:
      return "/notifications";
  }
}
