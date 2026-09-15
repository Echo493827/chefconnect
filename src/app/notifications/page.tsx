import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { NotificationRow } from "@/components/notifications/notification-row";
import { MarkAllRead } from "@/components/notifications/mark-all-read";
import { notificationHref } from "@/lib/notifications/links";
import { PageShell, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/notifications");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, kind, title, body, data, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const list = notifications ?? [];
  const hasUnread = list.some((n) => !n.read_at);

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl tracking-tight">Notifications</h1>
        {hasUnread && <MarkAllRead />}
      </div>

      <div className="mt-6">
        {list.length === 0 ? (
          <EmptyState title="Nothing here yet">
            Booking confirmations, cancellations, and class recaps will show up here.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {list.map((n) => (
              <li key={n.id}>
                <NotificationRow
                  id={n.id}
                  title={n.title}
                  body={n.body}
                  createdAt={n.created_at}
                  unread={!n.read_at}
                  href={notificationHref(n.kind, n.data as Record<string, unknown> | null)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
