"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type ReportStatus = Database["public"]["Enums"]["report_status"];

// Confirm the caller is an admin before doing anything. The RPCs re-check this
// in the database too, so this is defence in depth, not the only guard.
async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, ok: false as const };
  const { data } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  return { supabase, ok: data?.role === "admin" };
}

export async function adminArchiveClass(classId: string): Promise<void> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return;
  await supabase.rpc("admin_set_class_status", { p_class_id: classId, p_status: "archived" });
  revalidatePath("/admin");
}

export async function adminRestoreClass(classId: string): Promise<void> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return;
  // restore to draft so the chef decides whether to re-publish
  await supabase.rpc("admin_set_class_status", { p_class_id: classId, p_status: "draft" });
  revalidatePath("/admin");
}

export async function adminSetChefSuspended(chefProfileId: string, suspended: boolean): Promise<void> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return;
  await supabase.rpc("admin_set_chef_suspended", { p_chef_profile_id: chefProfileId, p_suspended: suspended });
  revalidatePath("/admin");
}

export async function adminResolveReport(reportId: string, status: ReportStatus): Promise<void> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return;
  await supabase.rpc("resolve_report", { p_report_id: reportId, p_status: status });
  revalidatePath("/admin");
}
