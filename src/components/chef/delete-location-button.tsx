"use client";

import { useTransition } from "react";
import { deleteLocation } from "@/lib/chef/location-actions";

// Delete a location. Sessions reference locations with ON DELETE RESTRICT, so if
// one is in use the database refuses and we tell the chef why.
export function DeleteLocationButton({ locationId }: { locationId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remove this location? Sessions already using it will block this.")) return;
        startTransition(() => void deleteLocation(locationId));
      }}
      className="text-sm text-walnut transition-colors hover:text-paprika disabled:opacity-60"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
