"use client";

import { useTransition } from "react";
import {
  adminArchiveClass,
  adminRestoreClass,
  adminSetChefSuspended,
  adminResolveReport,
} from "@/lib/admin/actions";
import type { Database } from "@/lib/database.types";

type ReportStatus = Database["public"]["Enums"]["report_status"];

function useRun() {
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<void>) => startTransition(() => void fn());
  return { pending, run };
}

const secondary =
  "rounded border border-line bg-cream px-3 py-1.5 text-sm text-iron transition-colors hover:border-walnut disabled:opacity-60";
const danger =
  "rounded border border-line bg-cream px-3 py-1.5 text-sm text-paprika transition-colors hover:border-paprika disabled:opacity-60";

export function ClassModeration({ classId, status }: { classId: string; status: string }) {
  const { pending, run } = useRun();
  if (status === "archived") {
    return (
      <button type="button" disabled={pending} onClick={() => run(() => adminRestoreClass(classId))} className={secondary}>
        {pending ? "Working…" : "Restore to draft"}
      </button>
    );
  }
  return (
    <button type="button" disabled={pending} onClick={() => run(() => adminArchiveClass(classId))} className={danger}>
      {pending ? "Working…" : "Take down"}
    </button>
  );
}

export function ChefModeration({ chefProfileId, suspended }: { chefProfileId: string; suspended: boolean }) {
  const { pending, run } = useRun();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => run(() => adminSetChefSuspended(chefProfileId, !suspended))}
      className={suspended ? secondary : danger}
    >
      {pending ? "Working…" : suspended ? "Reinstate" : "Suspend"}
    </button>
  );
}

export function ReportModeration({ reportId }: { reportId: string }) {
  const { pending, run } = useRun();
  const resolve = (status: ReportStatus) => run(() => adminResolveReport(reportId, status));
  return (
    <div className="flex gap-2">
      <button type="button" disabled={pending} onClick={() => resolve("dismissed")} className={secondary}>
        Dismiss
      </button>
      <button type="button" disabled={pending} onClick={() => resolve("actioned")} className={danger}>
        Mark actioned
      </button>
    </div>
  );
}
