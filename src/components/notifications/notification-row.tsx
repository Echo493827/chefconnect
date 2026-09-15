"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markNotificationRead } from "@/lib/notifications/actions";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// A clickable notification: marks itself read (if unread), then navigates to its
// target.
export function NotificationRow({
  id,
  title,
  body,
  createdAt,
  unread,
  href,
}: {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
  unread: boolean;
  href: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function open() {
    if (unread) startTransition(() => void markNotificationRead(id));
    router.push(href);
  }

  return (
    <button
      type="button"
      onClick={open}
      className={`flex w-full items-start gap-3 py-4 text-left transition-colors hover:bg-cream/60 ${unread ? "" : "opacity-70"}`}
    >
      <span
        aria-hidden="true"
        className={`mt-2 h-2 w-2 shrink-0 rounded-full ${unread ? "bg-olive" : "bg-transparent"}`}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className={`truncate ${unread ? "font-medium text-iron" : "text-walnut"}`}>{title}</span>
          <span className="shrink-0 text-xs text-walnut">{timeAgo(createdAt)}</span>
        </span>
        {body && <span className="mt-0.5 block text-sm leading-relaxed text-walnut">{body}</span>}
      </span>
    </button>
  );
}
