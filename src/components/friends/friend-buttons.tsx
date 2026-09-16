"use client";

import { useTransition } from "react";
import { respondFriendRequest, removeFriendship, sendFriendRequest } from "@/lib/friends/actions";
import { startDm } from "@/lib/messages/dm-actions";

const primary = "rounded bg-olive px-3 py-1.5 text-sm font-medium text-cream transition-colors hover:bg-olive-deep disabled:opacity-60";
const secondary = "rounded border border-line bg-cream px-3 py-1.5 text-sm text-iron transition-colors hover:border-walnut disabled:opacity-60";
const subtle = "text-sm text-walnut transition-colors hover:text-paprika disabled:opacity-60";

export function RespondButtons({ friendshipId }: { friendshipId: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <button type="button" disabled={pending} onClick={() => start(() => void respondFriendRequest(friendshipId, true))} className={primary}>
        Accept
      </button>
      <button type="button" disabled={pending} onClick={() => start(() => void respondFriendRequest(friendshipId, false))} className={secondary}>
        Decline
      </button>
    </div>
  );
}

export function RemoveButton({ friendshipId, label }: { friendshipId: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (label === "Remove" && !confirm("Remove this friend?")) return;
        start(() => void removeFriendship(friendshipId));
      }}
      className={subtle}
    >
      {pending ? "…" : label}
    </button>
  );
}

export function AddFriendButton({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(() => void sendFriendRequest(userId))} className={secondary}>
      {pending ? "Sending…" : "Add friend"}
    </button>
  );
}

export function MessageFriendButton({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(() => void startDm(userId))} className={secondary}>
      {pending ? "Opening…" : "Message"}
    </button>
  );
}
